---
title: Fixing Tensorboard Plugins Not Loading on Safari
date: 2022-11-17 22:30:34
tags: [Front End]
---

# Fixing Tensorboard Plugins Not Loading on Safari

I'm planning to develop a customized plugin for Tensorboard. After downloading the official example plugin and installing it, I found it works on Chrome but only shows a white screen on Safari.

The console error message shows like this:

```
W1117 22:38:41.826974 13009694720 application.py:558] path /data/static/index.js not found, sending 404
```

## Reason

It's obviously caused by a path issue. On Chrome, when I click the plugin tag, it sends a request to:
```
http://localhost:6006/data/plugin/example_raw_scalars/static/index.js
```
But on Safari, it sends to the wrong path:
```
http://localhost:6006/data/static/index.js
```
I searched the source code and suspect [this line](https://github.com/tensorflow/tensorboard/blob/master/tensorboard/backend/application.py#L376) of code uses relative path, and may behave differently on Safari and Chrome:
```python
module_json = json.dumps("." + module_path)
```

## A Temporal Workaround

If we manually append the missing path in plugin.py, it works on Safari. But clearly, Chrome will fail because of the repeated path. Is there a way to make both browsers work?

```python
def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
          es_module_path="/plugin/example_raw_scalars/static/index.js"
        ) # works on Safari
```

Since now Chrome will request this file:
```
/data/plugin/example_raw_scalars/plugin/example_raw_scalars/static/index.js
```
A workaround will be to copy the index.js file to this long address. Now, we have two copies of index.js, one serves for Safari and the other one serves for Chrome.

To let the installer copy the resource files in `plugin/...` folder, we need to modify the `setup.py` file:

```python
package_data={
    "tensorboard_plugin_example_raw_scalars": ["static/**",
                                                   "plugin/example_raw_scalars/static/**"],
}
```

Otherwise, only the files in `static` folder are copied and other files are still missing. We also need to make a copy of the `_serve_static_file` function, and rename the new one with `_serve_static_file_chrome`. Then, tell Tensorboard also to load files in the `plugin` folder:

```python
def get_plugin_apps(self):
  return {
      "/scalars": self.scalars_route,
      "/tags": self._serve_tags,
      "/static/*": self._serve_static_file,
      "/plugin/example_raw_scalars/static/*": self._serve_static_file_chrome, # add this
  }
```

Now let's fix the file paths in the `_server_static_file_chrome` function:

```python
def _serve_static_file_chrome(self, request):
    """Returns a resource file from the static asset directory.

    Requests from the frontend have a path in this form:
    /data/plugin/example_raw_scalars/static/foo
    This serves the appropriate asset: ./static/foo.

    Checks the normpath to guard against path traversal attacks.
    """
    static_path_part = request.path[len(_PLUGIN_DIRECTORY_PATH_PART_CHROME) :]
```

Where `_PLUGIN_DIRECTORY_PATH_PART_CHROME` is defined as:

```python
_PLUGIN_DIRECTORY_PATH_PART_CHROME =
	"/data/plugin/example_raw_scalars/plugin/example_raw_scalars/"
```

Build and run the plugin, it should work on both Safari and Chrome now. 🎉



PS: I also submitted an issue on [Github](https://github.com/tensorflow/tensorboard/issues/6059). Let's see if this can be confirmed as a bug.
