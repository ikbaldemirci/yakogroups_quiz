
import { useState, useEffect } from "react";
import { Wheel } from "react-custom-roulette";

interface WheelComponentProps {
    players: { nickname: string }[];
    winner: string | null;
    spinning: boolean;
    onStopSpinning: () => void;
}

export default function WheelComponent({
    players,
    winner,
    spinning,
    onStopSpinning,
}: WheelComponentProps) {
    const [data, setData] = useState<any[]>([]);
    const [prizeNumber, setPrizeNumber] = useState<number>(0);

    useEffect(() => {
        if (players.length > 0) {
            const colors = [
                "#8B5CF6",
                "#EC4899",
                "#10B981",
                "#F59E0B",
                "#3B82F6",
                "#EF4444",
            ];

            const wheelData = players.map((p, i) => ({
                option: p.nickname,
                style: { backgroundColor: colors[i % colors.length], textColor: "white" },
            }));
            setData(wheelData);
        }
    }, [players]);

    useEffect(() => {
        if (winner && players.length > 0) {
            const index = players.findIndex((p) => p.nickname === winner);
            if (index !== -1) {
                setPrizeNumber(index);
            }
        }
    }, [winner, players]);

    if (players.length === 0 || data.length === 0) return null;

    return (
        <div className="flex flex-col items-center">
            <Wheel
                mustStartSpinning={spinning}
                prizeNumber={prizeNumber}
                data={data}
                onStopSpinning={onStopSpinning}
                backgroundColors={["#3e3e3e", "#df3428"]}
                textColors={["#ffffff"]}
                outerBorderColor="#eab308"
                outerBorderWidth={6}
                innerRadius={10}
                radiusLineColor="#ffffff"
                radiusLineWidth={2}
                fontSize={16}
                perpendicularText={true}
                textDistance={65}
            />
        </div>
    );
}
