
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
    const sortedPlayers = [...players].sort((a, b) => a.nickname.localeCompare(b.nickname));

    const colors = [
        "#8B5CF6",
        "#EC4899",
        "#10B981",
        "#F59E0B",
        "#3B82F6",
        "#EF4444",
    ];

    const data = sortedPlayers.map((p, i) => ({
        option: p.nickname,
        style: { backgroundColor: colors[i % colors.length], textColor: "white" },
    }));

    const prizeNumber = winner
        ? sortedPlayers.findIndex((p) => p.nickname === winner)
        : 0;

    if (sortedPlayers.length === 0 || data.length === 0) return null;

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
