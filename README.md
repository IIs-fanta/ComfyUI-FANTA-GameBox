# FANTA游戏盒

这是一个为ComfyUI设计的游戏节点集合，目前包含以下游戏：

## 贪吃蛇游戏 (Snake Game)
- 使用方向键控制蛇的移动
- 按空格键暂停/继续游戏
- 按回车键重新开始游戏
- 点击画布开始游戏
- 支持分数显示和游戏状态提示

## 像素鸟游戏 (Flappy Bird)
- 使用空格键控制小鸟飞行
- 按回车键开始/重新开始游戏
- 点击画布控制小鸟飞行
- 支持分数显示和游戏状态提示

## 安装方法

1. 将此仓库克隆到ComfyUI的`custom_nodes`目录下：
```bash
cd ComfyUI/custom_nodes
git clone [https://github.com/IIs-fanta/ComfyUI-FANTA-GameBox.git](https://github.com/IIs-fanta/ComfyUI-FANTA-GameBox.git)
```

2. 重启ComfyUI

## 使用方法

1. 在ComfyUI的节点菜单中找到"游戏"分类
2. 选择想要添加的游戏节点
3. 将节点添加到工作流中
4. 开始游戏！

## 注意事项

- 游戏节点不需要任何输入或输出
- 游戏状态会自动保存
- 支持多个游戏节点同时运行
- 游戏界面会随节点大小自动调整

## 更新日志

### v1.0.0
- 添加贪吃蛇游戏
- 添加像素鸟游戏
- 支持基本的游戏控制
- 支持分数显示
- 支持游戏状态提示

## 许可证

MIT License
