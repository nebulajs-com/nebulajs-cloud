<p align="center">
	<img width="100" alt="logo" src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fnebulajs.png">
</p>
<h1 align="center" style="margin: 30px 0 30px; font-weight: bold;">Nebulajs Cloud低代码开发平台</h1>
<h4 align="center">基于Node.js + Amis开发的SAAS化低代码快速开发平台</h4>
<!-- p align="center">
	<a href="https://gitee.com/nebulajs/nebulajs-cloud/stargazers">
        <img src="https://gitee.com/nebulajs/nebulajs-cloud/badge/star.svg?theme=gvp">
    </a>
	<a href="https://gitee.com/nebulajs/nebulajs-cloud">
        <img src="https://img.shields.io/badge/NebulajsCloud-v4.8.1-brightgreen.svg">
    </a>
	<a href="https://gitee.com/nebulajs/nebulajs-cloud/blob/master/LICENSE">
        <img src="https://img.shields.io/github/license/mashape/apistatus.svg">
    </a>
</p!-->

---


## 先听我说：

* ### 网上的低代码平台大都是基于`Java`开发的。
* ### 本平台使用`Node.js`作为开发语言，开发效率可以碾压`Java`。

 > * 🍎 如果您是`Node.js`开发人员
 > * 🍐 如果您是前端`Javascript`开发人员
 > * 🍑 如果您厌倦了`Java`开发

* ### 请试试这一款，开源不易请点个`Star`吧


##
##


## 一、平台说明
Nebulajs Cloud是一个基于`Node.js`的低码云平台。它适用于多种不同类型企业的多样化场景企业应用开发、系统项目实施与数字化建设。

Nebulajs Cloud应用是由`SAAS通用模块`和`业务模块`两种方式组合而成的。`SAAS通用模块`由云平台统一提供，无需代码生成。如：系统管理、流程管理等功能。
`业务模块`则是由用户设置模型属性后进行代码生成，用户可以对其进行灵活地`定制和开发`。

#### 1.平台演示（请先`Star`本项目，然后使用`gitee`/`github`方式登录）
 * 地址：http://server.nebulajs.com:3000/
 * 说明：以前`Star`过的小伙伴，可以取消后重新`Star`，即可登录。

#### 2.应用演示
  * 地址：http://server.nebulajs.com:15000/
  * 帐密：`admin` / `admin`

## 二、平台功能
#### 1.应用开发
 * 前端代码生成：生成`Amis`前端代码。
 * 后端代码生成：生成`Node.js`后端接口代码。
 * 文档生成：通过接口注释生成`Swagger`文档。
 * 页面设计：集成 [百度Amis](https://aisuda.bce.baidu.com/amis/zh-CN/docs/index) 设计器，支持在线设计页面。
 * 在线调试：集成WEB版`VSCODE`编辑器，可以在线启动调试应用。
 * 云环境：通过Docker方便地启动所依赖的中间件。
   * `MySQL`：关系数据库
   * `SQLite`：本地关系数据库
   * `Redis`：分布式缓存
   * `MongoDB`：KV数据库

#### 2.运行维护
 * 打包构建：应用版本管理，将应用构建为为`Docker`镜像。
 * 应用发布：启动应用实例，发布、回退应用版本。
 * 日志查看：查看应用实例运行日志。
 * 配置中心：管理应用的配置文件。通过不同配置文件，启动不同环境的应用实例。
 * 定时任务：定时执行`Javascript`脚本，支持`CRON`表达式。
 * 应用监控：（开发中）

#### 3.通用云功能
 * 用户登录：系统用户登录。
 * 系统集成：集成用户授权，通过`JWT`+`OAuth2.0`快速地和现有应用做权限集成。
 * 菜单管理：配置系统菜单，路由，及角色绑定等。
 * 用户管理：管理系统用户，用户配置角色权限。
 * 组织管理：部门组织管理，组织上下级关系设置。
 * 角色管理：角色管理，角色菜单权限分配。
 * 字典管理：维护系统中的固定常量值、枚举等。

#### 4.流程功能
 * 流程引擎：集成`Camunda`工作流，支持`BPMN 2.0`标准。
 * 流程设计：集成在线流程设计器，拖拽式设计流程
 * 流程表单：支持模型和流程绑定，设置某个流程节点的字段显示及权限。
 * 我的待办：显示我的待办流程。
 * 我的已办：显示我的已办流程。
 * 我发起的：显示我发起的流程。


## 三、演示图

#### 3.1 云平台
<table>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1501747901234_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1961748565483_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1971748565532_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1981748565546_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1991748565583_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1521747905876_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1541747906231_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1551747906544_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1701747980879_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1721747991209_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F2001748565621_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F2011748568604_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>

</table>

#### 3.2 页面设计器
[nebula-page-editor](https://gitee.com/nebulajs/nebula-page-editor)

![](https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1531747906033_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100)

#### 3.3 流程设计器
[nebulajs-workflow-modeler](https://gitee.com/nebulajs/nebulajs-workflow-modeler)

![](https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1781748086853_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100)
![](https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1771748086827_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100)

#### 3.4 代码编辑器
![](https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1481747832488_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100)

#### 3.5 云应用

<table>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2F1511747901261_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1791748088407_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1611747915966_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1651747916161_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1621747916019_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1661747916241_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1671747916297_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1691747916349_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1741748086514_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1801748088444_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
    <tr>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1821748088489_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
        <td><img src="https://nebulajs-1251015100.cos.ap-chengdu.myqcloud.com/screenshot%2Fsystem%2F1831748088600_.pic.jpg?imageMogr2/thumbnail/1920x/format/webp/interlace/0/quality/100"></td>
    </tr>
</table>

## 四、在线文档

在线文档： [https://docs.nebulajs.com](https://docs.nebulajs.com)

## 五、技术交流

 * __QQ群__

[![加入QQ群](https://img.shields.io/badge/%E6%AC%A2%E8%BF%8E-893262803-blue.svg)](https://qm.qq.com/q/INqDsH5MsI)  

