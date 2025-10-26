// themes/icarus/scripts/index.js
module.exports = function (hexo) {
    // 统一加载器：兼容导出函数 / 导出 { register } / 纯副作用模块
    function load(modPath) { const m = require(modPath); if (typeof m === 'function') return m(hexo); if (m && typeof m.register === 'function') return m.register(hexo); return m; }

    [
        '../includes/tasks/welcome',
        '../includes/tasks/check_deps',
        '../includes/tasks/check_config',
        '../includes/generators/categories',
        '../includes/generators/category',
        '../includes/generators/tags',
        '../includes/generators/insight',
        '../includes/helpers/cdn',
        '../includes/helpers/config',
        '../includes/helpers/layout',
        '../includes/helpers/override',
        '../includes/helpers/page',
        '../includes/helpers/site',
    ].forEach(load);

    // Fix large blog rendering OOM —— 只在 hook 存在时才注销
    const hooks = ['after_render:html', 'after_post_render'];
    const toRemove = new Set(['hexoMetaGeneratorInject', 'externalLinkFilter']);
    hooks.forEach(hook => {
        const list = hexo.extend && hexo.extend.filter && hexo.extend.filter.list && hexo.extend.filter.list();
        const arr = list && list[hook];
        if (Array.isArray(arr)) {
            arr
                .filter(f => f && toRemove.has(f.name))
                .forEach(f => hexo.extend.filter.unregister(hook, f));
        }
    });

    // Debug helper
    hexo.extend.helper.register('console', function () {
        // 展开打印更清晰
        // eslint-disable-next-line no-console
        console.log(...arguments);
    });

    // 更稳健的 excerpt：取文章前两个 <p> 之间的内容；无则返回空串
    hexo.extend.helper.register('excerpt', function (post) {
        if (post && post.excerpt) return post.excerpt;

        const html = (post && post.content) || '';
        const first = html.indexOf('<p>');
        if (first < 0) return '';
        let second = html.indexOf('<p>', first + 3);
        if (second < 0) second = html.length;
        return html.substring(first, second);
    });
};

module.exports(hexo);