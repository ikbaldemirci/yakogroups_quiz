import React from "react";

interface AdPlayerProps {
    url: string;
    onEnded?: () => void;
}

const AdPlayer: React.FC<AdPlayerProps> = ({ url, onEnded }) => {
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

    const getYoutubeId = (rawUrl: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = rawUrl.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    if (isYouTube) {
        const videoId = getYoutubeId(url);
        if (videoId) {
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&enablejsapi=1`;
            return (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border-4 border-amber-400">
                    <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title="YouTube Advertisement"
                    ></iframe>
                </div>
            );
        }
    }

    return (
        <div className="flex flex-col items-center justify-center p-10 bg-slate-100 rounded-xl text-slate-500 italic">
            Geçerli bir YouTube linki bulunamadı.
        </div>
    );
};

export default AdPlayer;
