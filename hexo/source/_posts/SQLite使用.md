---
title: SQLite.Swift 简单使用
date: 2017-12-31 01:18:14
tags: SQLite
---

# SQLite.Swift + Codable 简单使用

SQLite.Swift 在新版本中支持了 Swift4 的新特性 Codable。SQLite 体积小，是一个轻量级的数据库，而 SQLite.Swift 则是用 Swift 对其进行了封装，而在多数情况下不必撰写 SQL 语句。得益于 Codale，使用 SQLite.Swift 进行数据持久化将更加简单。

下面，我用 SQLite.Swift 构建了一个简单的笔记本应用，来熟悉它的基本使用方式。

### 定义数据模型

每一条笔记是一个 NoteItem 类型的结构体。由于我打算让它的主键自增，所以要重写 encode 方法。否则，可能就要用 uuid 来作为主键了，有点杀鸡用牛刀的感觉。

```swift
struct NoteItem: Codable {
    var id = 0
    var title = ""
    var content = ""
    var timeStamp = 0
    
    init(title: String, content: String, timeStamp: Int) {
        self.title = title
        self.content = content
        self.timeStamp = timeStamp
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(title, forKey: .title)
        try container.encode(content, forKey: .content)
        try container.encode(timeStamp, forKey: .timeStamp)
    }
}
```

因为要用自增主键，就不能自己设定 id，否则 SQLite 会报错。因此要重写 encode 方法，不对对 id 进行编码。而 decode 方法不覆盖，即使用默认方法，把所有属性全部赋值。

### 连接数据库

构建一个数据库管理类，叫 DataBaseHandler。首先要连接数据库才能进行使用。

```swift
class DataBaseHandler {
    var db: Connection!
    func connect() {
        do {
            db = try Connection(getFilePath())
        } catch {
            print("连接数据库失败")
        }
    }
  	func getFilePath() -> String {
        return NSHomeDirectory() + "/Documents/db.sqlite3"
    }
}
```

### 新建 Table

```swift
let id = Expression<Int64>("id")
let title = Expression<String>("title")
let content = Expression<String>("content")
let timeStamp = Expression<Int64>("timeStamp")
    
let noteList = Table("NoteList")
func createTable() {
    do {
        try db.run(noteList.create(ifNotExists: true) {
            t in
            t.column(id, primaryKey: .autoincrement)
            t.column(title)
            t.column(content)
            t.column(timeStamp)
        })
    } catch {
        print("建表失败")
    }
}
```

这里指定只有在 Table 不存在的时候才创建。按照数据模型添加列，并把 id 指定为自增主键以获得更好的查找性能。

### 删除行

作为一个笔记本应用，当然要支持滑动删除。

```swift
func deleteItem(id: Int) {
    let item = noteList.filter(Int64(id) == self.id)
    do {
        try db.run(item.delete())
    } catch {
        print("删除失败")
    }
}
```

这里先通过 id 查找出元素，再调用 `db.run(item.delete())` 就可以了，等价于 SQL 语句 `DELETE FROM "NoteList" WHERE ("id" = \(id))` 。

### 插入行

```swift
func insert(_ item: NoteItem) -> Int {
    do {
        try db.run(noteList.insert(item))
        return Int(db.lastInsertRowid)
    } catch {
        print(error)
        print("插入失败")
    }
    return 0
}
```

由于 id 是数据库自己生成的，为了让外界能拿到 id 号来进行其他的操作，必须把新插入的 id 号返回。可以用 `db.lastInsertRowid` 拿到最新插入的 id，但其实 `run()` 函数也是有返回值的，返回值就是 rowid，也可以直接返回。

### 更新行

笔记本应用一个常见的操作是编辑已有的笔记，因此需要把已有的行更新。也可以删除旧行再插入新行，但更新的效率更高。

```swift
func update(_ item: NoteItem) {
    let oldItem = noteList.filter(Int64(item.id) == self.id)
    do {
        try db.run(oldItem.update(item))
    } catch {
        print("更新失败")
    }
}
```

### 获取所有行

在笔记本应用打开时，应该展示所有已有的笔记，因此需要将数据库所有的元素都取出。

```swift
func getAllItems() -> [NoteItem] {
    do {
        return try db.prepare(noteList).map({ row in
            return try row.decode()
        })
    } catch {
        print("查找失败")
    }
    return []
}
```

------

数据持久化的部分到这里就完成了，剩下的操作就只有构建界面了。需要注意的是，应该尽量减少操作文件，毕竟读硬盘的速度比内存操作慢得多，因此各个界面中应该通过其他方式传值，而不是都根据数据库的内容来更新界面。