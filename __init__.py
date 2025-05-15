import os
import folder_paths

# 导入所有游戏节点
from .snake_game_node import NODE_CLASS_MAPPINGS as SNAKE_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS as SNAKE_DISPLAY_MAPPINGS
from .flappy_bird_node import NODE_CLASS_MAPPINGS as FLAPPY_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS as FLAPPY_DISPLAY_MAPPINGS
from .brick_breaker_node import NODE_CLASS_MAPPINGS as BRICK_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS as BRICK_DISPLAY_MAPPINGS
from .billiards_node import NODE_CLASS_MAPPINGS as BILLIARDS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS as BILLIARDS_DISPLAY_MAPPINGS

# 合并所有节点的映射
NODE_CLASS_MAPPINGS = {
    **SNAKE_MAPPINGS,
    **FLAPPY_MAPPINGS,
    **BRICK_MAPPINGS,
    **BILLIARDS_MAPPINGS
}

NODE_DISPLAY_NAME_MAPPINGS = {
    **SNAKE_DISPLAY_MAPPINGS,
    **FLAPPY_DISPLAY_MAPPINGS,
    **BRICK_DISPLAY_MAPPINGS,
    **BILLIARDS_DISPLAY_MAPPINGS
}

# 初始化game文件夹路径
if "game" not in folder_paths.folder_names_and_paths:
    folder_paths.folder_names_and_paths["game"] = []

# 添加js文件夹路径
js_folder_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "js")
if js_folder_path not in folder_paths.folder_names_and_paths["game"]:
    folder_paths.folder_names_and_paths["game"].append(js_folder_path)

# 添加游戏资源文件夹路径
game_assets_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "game_assets")
if game_assets_path not in folder_paths.folder_names_and_paths["game"]:
    folder_paths.folder_names_and_paths["game"].append(game_assets_path)

WEB_DIRECTORY = "js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']

print("🎮 所有游戏节点已注册")