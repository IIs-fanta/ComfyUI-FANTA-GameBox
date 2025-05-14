class BrickBreakerNode:
    """
    一个用于嵌入打砖块游戏的 ComfyUI 节点，主要作为 JS 小部件的容器。
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {}
        }

    RETURN_TYPES = ()
    FUNCTION = "run_game_placeholder"
    OUTPUT_NODE = True
    CATEGORY = "fun"

    def run_game_placeholder(self, **kwargs):
        # Python 端不运行游戏，JS 端负责。
        return ()


NODE_CLASS_MAPPINGS = {
    "BrickBreakerNode": BrickBreakerNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "BrickBreakerNode": "Play Brick Breaker"
}

print("🧱 Brick Breaker Game Node loaded")