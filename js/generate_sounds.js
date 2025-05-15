// 使用Web Audio API生成音效
class SoundGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 生成碰撞音效
    generateHitSound() {
        const duration = 0.1;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-10 * t);
        }

        return this.saveBufferAsWav(buffer, 'hit');
    }

    // 生成进袋音效
    generatePocketSound() {
        const duration = 0.3;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-5 * t);
        }

        return this.saveBufferAsWav(buffer, 'pocket');
    }

    // 生成库边碰撞音效
    generateCushionSound() {
        const duration = 0.2;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 330 * t) * Math.exp(-8 * t);
        }

        return this.saveBufferAsWav(buffer, 'cushion');
    }

    // 生成胜利音效
    generateWinSound() {
        const duration = 1.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-2 * t) +
                     Math.sin(2 * Math.PI * 550 * t) * Math.exp(-2 * t) +
                     Math.sin(2 * Math.PI * 660 * t) * Math.exp(-2 * t);
        }

        return this.saveBufferAsWav(buffer, 'win');
    }

    // 生成犯规音效
    generateFoulSound() {
        const duration = 0.5;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-4 * t);
        }

        return this.saveBufferAsWav(buffer, 'foul');
    }

    // 生成开球音效
    generateBreakSound() {
        const duration = 0.4;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 330 * t) * Math.exp(-6 * t) +
                     Math.sin(2 * Math.PI * 440 * t) * Math.exp(-6 * t);
        }

        return this.saveBufferAsWav(buffer, 'break');
    }

    // 将音频缓冲区保存为WAV文件
    saveBufferAsWav(buffer, filename) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = buffer.length * blockAlign;
        const bufferSize = 44 + dataSize;

        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);

        // RIFF标识
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        this.writeString(view, 8, 'WAVE');

        // fmt子块
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);

        // data子块
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // 写入采样数据
        const offset = 44;
        const channelData = [];
        for (let i = 0; i < numChannels; i++) {
            channelData.push(buffer.getChannelData(i));
        }

        let pos = 0;
        while (pos < buffer.length) {
            for (let i = 0; i < numChannels; i++) {
                const sample = Math.max(-1, Math.min(1, channelData[i][pos]));
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset + pos * blockAlign + i * bytesPerSample, value, true);
            }
            pos++;
        }

        // 创建Blob并下载
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.wav`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 辅助函数：写入字符串
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // 生成所有音效
    generateAllSounds() {
        this.generateHitSound();
        this.generatePocketSound();
        this.generateCushionSound();
        this.generateWinSound();
        this.generateFoulSound();
        this.generateBreakSound();
    }
}

// 导出生成器
export { SoundGenerator }; 