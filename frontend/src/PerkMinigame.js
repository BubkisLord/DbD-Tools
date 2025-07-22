import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

function normaliseDescription(desc) {
    if (!desc) return "";
    let cleaned = desc
        .trim("<br />")
        .replace(/<img[\s\S]*?>/gi, "")
        .replace(
            /<span[^>]*class="(?:iconLink|pcView|pcIconLink|tooltip|tooltipBaseText|iconless|tooltiptext|flex|flexCenter|tooltipTextWrapper|mobileView|mobileIconLink)"[^>]*>[\s\S]*?<\/span>/gi,
            ""
        )
        .replace(/<span[^>]*typeof="mw:File"[^>]*>[\s\S]*?<\/span>/gi, "")
        .replace(
            /<span[^>]*class="(?:tooltiptext flex flexCenter|mobileView mobileIconLink)"[^>]*>\s*<\/span>/gi,
            ""
        )
        .replace(
            /<span[^>]*class="luaClr[^"]*"[^>]*>\s*["“”']*\s*<\/span>\s*/gi,
            ""
        )
        .replace(/<br\s*\/?>/gi, '<br style="line-height:2.5;" />')
        .replace(/\n/g, '<div style="height:0.5em"></div>')
        .replace(
            /(<div style="height:0\.5em"><\/div>|<p><\/p>|<br\s*\/?>)+$/gi,
            ""
        )
        .replace(
            /((<\/ul>\s*)?(<div style="height:0\.5em"><\/div>|<p><\/p>|<br\s*\/?>|\s)+)+$/gi,
            ""
        );
    return cleaned;
}

function PerkMinigame() {
    const [loading, setLoading] = useState(false);
    const [perkData, setPerkData] = useState(null);
    const [error, setError] = useState("");
    const [role, setRole] = useState("killer");
    const [updateMsg, setUpdateMsg] = useState("");
    const [selectedCharacters, setSelectedCharacters] = useState([]);
    const [selectedPerkName, setSelectedPerkName] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [winHistory, setWinHistory] = useState([]);

    const [settingOptions] = useState([
        {
            id: "Q_use_image",
            label: "Use Image in Question",
            defaultValue: true
        },
        { id: "Q_use_name", label: "Use Name in Question", defaultValue: true },
        {
            id: "Q_use_short_description",
            label: "Use Short Description in Question",
            defaultValue: false
        },
        {
            id: "Q_use_long_description",
            label: "Use Long Description in Question",
            defaultValue: false
        },
        {
            id: "A_use_image",
            label: "Use Image in Answer",
            defaultValue: false
        },
        { id: "A_use_name", label: "Use Name in Answer", defaultValue: false },
        {
            id: "A_use_short_description",
            label: "Use Short Description in Answer",
            defaultValue: false
        },
        {
            id: "A_use_long_description",
            label: "Use Long Description in Answer",
            defaultValue: true
        }
    ]);
    const [settings, setSettings] = useState(
        settingOptions.filter((opt) => opt.defaultValue).map((opt) => opt.id)
    );

    useEffect(() => {
        setSelectedCharacters([]);
        fetch(`${API_BASE}/characters?role=${role}`)
            .then((res) => res.json())
            .then((data) => {
                setSelectedCharacters(data.characters || []);
            });
    }, [role]);

    const fetchPerks = async () => {
        setLoading(true);
        setError("");
        setPerkData(null);
        setSelectedPerkName(null);
        try {
            const res = await fetch(`${API_BASE}/random_perks?role=${role}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ allowed: selectedCharacters })
            });
            if (!res.ok) throw new Error("Failed to fetch perk set.");
            const data = await res.json();
            setPerkData(data);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    const updateDatabase = async () => {
        setLoading(true);
        setUpdateMsg("");
        setError("");
        try {
            const res = await fetch(`${API_BASE}/update`, {
                method: "POST"
            });
            const data = await res.json();
            if (data.status === "success") {
                setUpdateMsg("Perk database updated!");
            } else {
                setError(data.message || "Update failed");
            }
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleCheckbox = (id) => {
        setPerkData();
        setSettings((prev) =>
            prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
        );
    };

    const handlePerkClick = (clickedPerk) => {
        setSelectedPerkName(clickedPerk.name);
        const correct = clickedPerk.name === perkData.chosen_perk.name;
        setWinHistory((prev) => [
            ...prev,
            { perkName: clickedPerk.name, clickedPerk: correct }
        ]);
        setIsCorrect(correct);
    };

    const selectAll = () => setSettings(settingOptions.map((opt) => opt.id));
    const deselectAll = () => setSettings([]);

    // Render logic can reuse almost all the layout from PerkMinigame — just rename variables and text labels accordingly.

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-row items-start py-8">
            <Link
                to="/"
                className="text-indigo-400 hover:text-indigo-300 absolute font-medium text-sm mt-4 ml-4 z-20">
                ← Back to Home
            </Link>
            <div className="flex-1">
                <h1 className="text-5xl font-extrabold mb-4 text-indigo-400 drop-shadow-lg tracking-tight text-center">
                    DbD Perks Quiz
                </h1>
                <div className="flex flex-row items-start w-screen-xl mx-auto">
                    {/* Settings Panel */}
                    <div className="w-1/4 max-h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 flex flex-col items-start text-left ml-4 mr-3">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                            Settings
                        </h2>
                        <div className="mb-4 w-full">
                            <label className="block mb-2 font-semibold">
                                Perk Type:
                            </label>
                            <select
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value);
                                    setPerkData(null);
                                }}
                                disabled={loading}>
                                <option value="any">All Perks</option>
                                <option value="killer">Killer Perks</option>
                                <option value="survivor">Survivor Perks</option>
                            </select>
                            <div className="flex flex-row items-start gap-2 w-full">
                                <button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 mt-4"
                                    onClick={updateDatabase}
                                    disabled={loading}>
                                    Reinitialise Database
                                </button>
                                <button
                                    className="w-full bg-green-600 hover:bg-green-700 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 mt-4"
                                    onClick={fetchPerks}
                                    disabled={
                                        loading ||
                                        selectedCharacters.length === 0
                                    }>
                                    Start Perk Quiz
                                </button>
                            </div>
                            {loading && (
                                <div className="mt-4 text-yellow-400 font-semibold animate-pulse">
                                    Loading...
                                </div>
                            )}
                            {updateMsg && (
                                <div className="mt-4 text-green-400 font-semibold">
                                    {updateMsg}
                                </div>
                            )}
                            {error && (
                                <div className="mt-4 text-red-400 font-semibold">
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="mb-4 w-full">
                            <div className="flex gap-2 mb-2">
                                <button
                                    className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs font-semibold"
                                    onClick={selectAll}
                                    disabled={loading}>
                                    Select All
                                </button>
                                <button
                                    className="bg-gray-700 hover:bg-gray-800 px-3 py-1 rounded text-xs font-semibold"
                                    onClick={deselectAll}
                                    disabled={loading}>
                                    Deselect All
                                </button>
                            </div>
                            <div
                                className="overflow-y-auto max-h-[550px] border border-gray-800 rounded-md p-2 bg-gray-800/60 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                                style={{
                                    scrollbarColor: "#4f46e5 #1a202c",
                                    scrollbarWidth: "thin"
                                }}>
                                <style>
                                    {`
                                    /* For Chrome, Edge, and Safari */
                                    .scrollbar-thin::-webkit-scrollbar {
                                        width: 8px;
                                        border-radius: 8px;
                                    }
                                    .scrollbar-thin::-webkit-scrollbar-thumb {
                                        background: #4f46e5;
                                        border-radius: 8px;
                                    }
                                    .scrollbar-thin::-webkit-scrollbar-track {
                                        background: #1a202c;
                                        border-radius: 8px;
                                    }
                                    `}
                                </style>
                                {settingOptions.map(({ id, label }) => (
                                    <label
                                        key={id}
                                        className="flex items-center gap-2 py-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.includes(id)}
                                            onChange={() => handleCheckbox(id)}
                                            className="accent-indigo-500"
                                            disabled={loading}
                                        />
                                        <span className="text-sm">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    {perkData ? (
                        <div
                            className="w-1/2 bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 relative overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                            style={{
                                maxHeight: "850px",
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}>
                            {perkData && (
                                <>
                                    {perkData.killer &&
                                        perkData.killer.icon && (
                                            <img
                                                src={perkData.killer.icon}
                                                alt={perkData.killer.name}
                                                className="absolute opacity-15 pointer-events-none select-none"
                                                style={{
                                                    top: "63%",
                                                    left: "50%",
                                                    transform:
                                                        "translate(-50%, -50%) scale(6)",
                                                    zIndex: 0,
                                                    filter: "blur(1px)"
                                                }}
                                            />
                                        )}
                                    <h2 className="text-3xl font-extrabold mb-4 text-pink-400 tracking-wide drop-shadow relative z-10">
                                        {role === "killer"
                                            ? "Killer Perk"
                                            : "Survivor Perk"}
                                        <br />
                                        <span className="text-4xl text-gray-100 font-black underline decoration-indigo-400 underline-offset-4 drop-shadow-lg">
                                            {selectedPerkName === null ? (
                                                role === "killer"
                                            ) : isCorrect ? (
                                                <button
                                                    className="w-full bg-green-600 hover:bg-green-700 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 mt-4"
                                                    onClick={fetchPerks}
                                                    disabled={
                                                        loading ||
                                                        selectedCharacters.length ===
                                                            0
                                                    }>
                                                    Correct: Go Again!
                                                </button>
                                            ) : (
                                                <button
                                                    className="w-full bg-indigo-700 hover:bg-indigo-600 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 mt-4"
                                                    onClick={fetchPerks}
                                                    disabled={
                                                        loading ||
                                                        selectedCharacters.length ===
                                                            0
                                                    }>
                                                    Incorrect: Try again
                                                </button>
                                            )}
                                        </span>
                                    </h2>
                                    <div className="mb-6 relative z-10">
                                        <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                            Perk Details:
                                        </h3>
                                        <ul className="list-disc ml-6 space-y-2">
                                            {
                                                <li
                                                    key={"chosenPerk"}
                                                    className="flex items-start gap-3">
                                                    {settings.includes(
                                                        "Q_use_image"
                                                    ) ? (
                                                        perkData.chosen_perk
                                                            .icon && (
                                                            <img
                                                                src={
                                                                    perkData
                                                                        .chosen_perk
                                                                        .icon
                                                                }
                                                                alt={
                                                                    perkData
                                                                        .chosen_perk
                                                                        .name
                                                                }
                                                                className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                                style={{
                                                                    marginTop: 6
                                                                }}
                                                            />
                                                        )
                                                    ) : (
                                                        <img
                                                            src={
                                                                "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e5/Unknown_QuestionMark.png"
                                                            }
                                                            alt={
                                                                perkData
                                                                    .chosen_perk
                                                                    .name
                                                            }
                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                            style={{
                                                                marginTop: 6
                                                            }}
                                                        />
                                                    )}
                                                    <div>
                                                        {settings.includes(
                                                            "Q_use_name"
                                                        ) ? (
                                                            <span className="font-black text-lg text-indigo-200 italic underline decoration-pink-400 underline-offset-4 drop-shadow">
                                                                {
                                                                    perkData
                                                                        .chosen_perk
                                                                        .name
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="font-black text-lg text-indigo-200 italic underline decoration-pink-400 underline-offset-4 drop-shadow">
                                                                [Name Hidden]
                                                            </span>
                                                        )}
                                                        {settings.includes(
                                                            "Q_use_long_description"
                                                        ) ? (
                                                            settings.includes(
                                                                "Q_use_name"
                                                            ) ? (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perkData
                                                                                .chosen_perk
                                                                                .description,
                                                                            true
                                                                        )
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perkData
                                                                                .chosen_perk
                                                                                .description,
                                                                            true
                                                                        ).replaceAll(
                                                                            perkData
                                                                                .chosen_perk
                                                                                .name,
                                                                            "[THIS PERK]"
                                                                        )
                                                                    }}
                                                                />
                                                            )
                                                        ) : (
                                                            settings.includes(
                                                                "Q_use_short_description"
                                                            ) &&
                                                            (settings.includes(
                                                                "Q_use_name"
                                                            ) ? (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perkData
                                                                                .chosen_perk
                                                                                .description,
                                                                            true
                                                                        )
                                                                            .split(
                                                                                "<br"
                                                                            )[0]
                                                                            .split(
                                                                                "<div"
                                                                            )[0]
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perkData
                                                                                .chosen_perk
                                                                                .description,
                                                                            true
                                                                        )
                                                                            .replaceAll(
                                                                                perkData
                                                                                    .chosen_perk
                                                                                    .name,
                                                                                "[THIS PERK]"
                                                                            )
                                                                            .split(
                                                                                "<br"
                                                                            )[0]
                                                                            .split(
                                                                                "<div"
                                                                            )[0]
                                                                    }}
                                                                />
                                                            ))
                                                        )}
                                                    </div>
                                                </li>
                                            }
                                        </ul>
                                    </div>
                                </>
                            )}
                            <div className="relative z-10">
                                <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                    Perk Effects:
                                </h3>
                                <ul className="list-disc ml-6 space-y-2">
                                    {perkData.perk_options?.map((perk, i) => {
                                        const isSelected =
                                            perk.name === selectedPerkName;
                                        const wasCorrect =
                                            perk.name ===
                                            perkData.chosen_perk.name;

                                        let bgClass =
                                            "bg-gray-900 hover:bg-gray-700";
                                        if (selectedPerkName !== null) {
                                            if (wasCorrect)
                                                bgClass =
                                                    "bg-green-700 hover:bg-green-700";
                                            else if (isSelected)
                                                bgClass =
                                                    "bg-red-700 hover:bg-red-700";
                                        }

                                        return (
                                            <li
                                                key={i}
                                                className="flex items-start gap-3">
                                                <button
                                                    onClick={() =>
                                                        handlePerkClick(perk)
                                                    }
                                                    disabled={
                                                        selectedPerkName !==
                                                        null
                                                    }
                                                    className={`flex text-left items-start gap-3 w-full rounded cursor-pointer border-none p-3 ${bgClass}`}>
                                                    {settings.includes(
                                                        "A_use_image"
                                                    ) ? (
                                                        perk.icon && (
                                                            <img
                                                                src={perk.icon}
                                                                alt={perk.name}
                                                                className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                                style={{
                                                                    marginTop: 6
                                                                }}
                                                            />
                                                        )
                                                    ) : (
                                                        <img
                                                            src={
                                                                "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e5/Unknown_QuestionMark.png"
                                                            }
                                                            alt={perk.name}
                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                            style={{
                                                                marginTop: 6
                                                            }}
                                                        />
                                                    )}
                                                    <div>
                                                        {settings.includes(
                                                            "A_use_name"
                                                        ) ? (
                                                            <span className="font-black text-lg text-indigo-200 italic underline decoration-pink-400 underline-offset-4 drop-shadow">
                                                                {perk.name}
                                                            </span>
                                                        ) : (
                                                            <span className="font-black text-lg text-indigo-200 italic underline decoration-pink-400 underline-offset-4 drop-shadow">
                                                                [Name Hidden]
                                                            </span>
                                                        )}
                                                        {settings.includes(
                                                            "A_use_long_description"
                                                        ) ? (
                                                            settings.includes(
                                                                "A_use_name"
                                                            ) ? (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perk.description,
                                                                            true
                                                                        )
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perk.description,
                                                                            true
                                                                        ).replaceAll(
                                                                            perk.name,
                                                                            "[THIS PERK]"
                                                                        )
                                                                    }}
                                                                />
                                                            )
                                                        ) : (
                                                            settings.includes(
                                                                "A_use_short_description"
                                                            ) &&
                                                            (settings.includes(
                                                                "A_use_name"
                                                            ) ? (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perk.description,
                                                                            true
                                                                        )
                                                                            .split(
                                                                                "<br"
                                                                            )[0]
                                                                            .split(
                                                                                "<div"
                                                                            )[0]
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            perk.description,
                                                                            true
                                                                        )
                                                                            .replaceAll(
                                                                                perk.name,
                                                                                "[THIS PERK]"
                                                                            )
                                                                            .split(
                                                                                "<br"
                                                                            )[0]
                                                                            .split(
                                                                                "<div"
                                                                            )[0]
                                                                    }}
                                                                />
                                                            ))
                                                        )}
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="w-1/2 min-h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 relative overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                            style={{
                                maxHeight: "850px",
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}
                        />
                    )}

                    <div className="w-1/4 h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 flex flex-col items-start text-left ml-3 mr-4">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                            Win History
                        </h2>
                        {winHistory.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                No attempts yet.
                            </p>
                        ) : (
                            <ul className="w-full space-y-2 overflow-y-auto h-full pr-1 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
                                {winHistory
                                    .slice()
                                    .reverse()
                                    .map((entry, idx) => (
                                        <li
                                            key={idx}
                                            className={`flex justify-between items-center px-3 py-2 rounded-md ${
                                                entry.clickedPerk
                                                    ? "bg-green-700 text-white"
                                                    : "bg-red-700 text-white"
                                            }`}>
                                            <span className="font-semibold text-sm">
                                                {entry.perkName ||
                                                    "Unknown Perk"}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-wide">
                                                {entry.clickedPerk
                                                    ? "Correct"
                                                    : "Incorrect"}
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PerkMinigame;
