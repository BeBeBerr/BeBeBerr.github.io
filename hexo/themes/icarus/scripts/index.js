require('../includes/tasks/welcome');
require('../includes/tasks/check_deps');
require('../includes/tasks/check_config');
require('../includes/generators/categories')(hexo);
require('../includes/generators/category')(hexo);
require('../includes/generators/tags')(hexo);
require('../includes/generators/insight')(hexo);
require('../includes/helpers/cdn')(hexo);
require('../includes/helpers/config')(hexo);
require('../includes/helpers/layout')(hexo);
require('../includes/helpers/override')(hexo);
require('../includes/helpers/page')(hexo);
require('../includes/helpers/site')(hexo);

// Fix large blog rendering OOM
const hooks = [
    'after_render:html',
    'after_post_render'
]
const filters = [
    'hexoMetaGeneratorInject',
    'externalLinkFilter'
];
hooks.forEach(hook => {
    hexo.extend.filter.list()[hook]
        .filter(filter => filters.includes(filter.name))
        .forEach(filter => hexo.extend.filter.unregister(hook, filter));
});

// Debug helper
hexo.extend.helper.register('console', function () {
    console.log(arguments)
});

hexo.extend.helper.register('excerpt', function (post) {
    var excerpt;
    if (post.excerpt) {
        //excerpt = post.excerpt.replace(/\<[^\>]+\>/g, '');
        excerpt = post.excerpt;
    } else {
        //excerpt = post.content.replace(/\<[^\>]+\>/g, '').substring(0, 200);
        var valueable_br = -1;
        var br = -1;
        var start = 0; // skip title
        for (var idx = 0; idx < 2; idx++) {
            br = post.content.indexOf('<p>', br+1);
            if (br < 0) {
                break;
            } else {
                if (idx == 0) {
                    start = br;
                }
                valueable_br = br;
            }
        }
        if (valueable_br < 0) {
            excerpt = 0;
        } else {
            excerpt = post.content.substring(start, br);
        }
        return excerpt;
    }
});