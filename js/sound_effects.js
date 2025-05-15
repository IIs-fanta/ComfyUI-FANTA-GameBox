class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
        this.loadSounds();
    }

    loadSounds() {
        const soundFiles = {
            'hit': 'game_assets/sounds/hit.mp3',
            'pocket': 'game_assets/sounds/pocket.mp3',
            'cushion': 'game_assets/sounds/cushion.mp3',
            'win': 'game_assets/sounds/win.mp3',
            'foul': 'game_assets/sounds/foul.mp3',
            'break': 'game_assets/sounds/break.mp3'
        };

        for (const [name, path] of Object.entries(soundFiles)) {
            this.sounds[name] = new Audio(path);
            this.sounds[name].volume = this.volume;
        }
    }

    play(soundName) {
        if (!this.enabled) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            // 重置音频到开始位置
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.warn(`无法播放音效 ${soundName}:`, error);
            });
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        for (const sound of Object.values(this.sounds)) {
            sound.volume = this.volume;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

export { SoundManager }; 