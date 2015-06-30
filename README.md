bone
============

没什么技术含量，只是backbone的简化版，保留了view, events, history, router。
个人使用下来这几个功能最有用。
不依赖jQuery和underscore，只有10k，小巧实用。

Bone.Events

Bone.Class

Bone.View

Bone.Router

Bone.History

范例代码：
1.为object添加事件功能
var obj = Bone.extend({}, Bone.Events, {...});

2.创建类
var cls = Bone.Class.extend({...});  
var view = Bone.View.extend({...});  



欢迎研讨。QQ:274924021  



 * VERSION: 0.2.0
 * DATE: 2015-06-16
