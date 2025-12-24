export const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.preload = "metadata";

        audio.onloadedmetadata = () => {
            window.URL.revokeObjectURL(audio.src);
            resolve(audio.duration);
        };

        audio.onerror = (error) => {
            reject(error);
        };

        audio.src = window.URL.createObjectURL(file);
    });
};
