import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

// Normalise and clean up HTML description for addons/perks
function normaliseDescription(desc, isAddon = false) {
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
        // Remove empty quote lines (span with only quotes and spaces)
        .replace(
            /<span[^>]*class="luaClr[^"]*"[^>]*>\s*["“”']{1,2}\s*["“”']{1,2}\s*<\/span>\s*/gi,
            ""
        )
        .replace(
            /<span[^>]*class="luaClr[^"]*"[^>]*>\s*["“”']*\s*<\/span>\s*/gi,
            ""
        )
        .replace(
            /<br\s*\/?>/gi,
            isAddon
                ? '<br style="line-height:0.01;" />'
                : '<br style="line-height:2.5;" />'
        )
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

function CustomMatchBuilds() {
    const [build, setBuild] = useState(null);

    useEffect(() => {
        const fetchBuild = async () => {
            setBuild(null);
            try {
                const res = await fetch(
                    `${API_BASE}/custom_match_random_builds`
                );
                if (!res.ok)
                    throw new Error("Failed to fetch custom match builds");
                const data = await res.json();
                setBuild(data);
            } catch (error) {
                console.error("Error fetching custom match builds:", error);
                setBuild(null);
            }
        };

        fetchBuild();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 py-8 relative">
            <Link
                to="/"
                className="text-indigo-400 hover:text-indigo-300 absolute font-medium text-sm mt-4 ml-4 z-20">
                ← Back to Home
            </Link>
            <div className="flex-1">
                <h1 className="text-5xl font-extrabold mb-10 text-indigo-400 drop-shadow-lg tracking-tight text-center">
                    DbD Custom Match Random Builds
                </h1>

                <div
                    className="grid gap-4 min-w-full max-w-screen-xl mx-auto px-4"
                    style={{
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
                    }}>
                    {build ? (
                        <>
                            {/* Killer Build */}
                            <div
                                className="col-span-2 bg-gray-900/90 rounded-xl shadow-2xl p-8 border border-gray-700 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                                style={{
                                    maxHeight: "850px",
                                    scrollbarColor: "#4f46e5 #1a202c",
                                    scrollbarWidth: "thin"
                                }}>
                                {build.killer.icon && (
                                    <img
                                        src={build.killer.icon}
                                        alt={build.killer.name}
                                        className="absolute opacity-15 pointer-events-none select-none"
                                        style={{
                                            top: "50%",
                                            left: "50%",
                                            transform:
                                                "translate(-50%, -50%) scale(6)",
                                            zIndex: 0,
                                            filter: "blur(1px)"
                                        }}
                                    />
                                )}
                                <h2 className="text-3xl font-extrabold mb-4 text-red-500 tracking-wide drop-shadow z-10">
                                    Killer: <br />
                                    <span className="text-4xl text-gray-100 font-black underline decoration-indigo-400 underline-offset-4 drop-shadow-lg">
                                        {build.killer.name}
                                    </span>
                                </h2>

                                <div className="relative z-10">
                                    <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                        Addons:
                                    </h3>
                                    <ul className="list-disc ml-6 space-y-2">
                                        {build.killer?.addons?.map(
                                            (addon, i) => (
                                                <li key={i}>
                                                    <span className="font-semibold text-indigo-200">
                                                        {addon.name}
                                                    </span>
                                                    <div
                                                        className="text-sm text-gray-400 whitespace-pre-line"
                                                        dangerouslySetInnerHTML={{
                                                            __html: normaliseDescription(
                                                                addon.description,
                                                                true
                                                            )
                                                        }}
                                                    />
                                                </li>
                                            )
                                        )}
                                    </ul>

                                    <h3 className="font-bold text-3xl mt-6 mb-2 text-indigo-300 tracking-tight">
                                        Perks:
                                    </h3>
                                    <ul className="list-disc ml-6 space-y-2">
                                        {build.killer?.perks?.map((perk, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-3">
                                                {perk.icon && (
                                                    <img
                                                        src={perk.icon}
                                                        alt={perk.name}
                                                        className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                        style={{ marginTop: 6 }}
                                                    />
                                                )}
                                                <div>
                                                    <span className="font-black text-lg text-indigo-200 italic underline decoration-indigo-400 underline-offset-6 drop-shadow">
                                                        {perk.name}{" "}
                                                        {perk.owner
                                                            ? `(${perk.owner})`
                                                            : ""}
                                                    </span>
                                                    <div
                                                        className="text-sm text-gray-400 whitespace-pre-line"
                                                        dangerouslySetInnerHTML={{
                                                            __html: normaliseDescription(
                                                                perk.description,
                                                                false
                                                            )
                                                        }}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Survivor Builds */}
                            {build.survivors?.map((survivorBuild, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-900/90 rounded-xl shadow-2xl p-8 border border-gray-700 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                                    style={{
                                        maxHeight: "850px",
                                        scrollbarColor: "#4f46e5 #1a202c",
                                        scrollbarWidth: "thin"
                                    }}>
                                    <h2 className="text-3xl font-extrabold mb-4 text-pink-400 tracking-wide drop-shadow z-10">
                                        Survivor {index + 1}:<br />
                                        <span className="text-4xl text-gray-100 font-black underline decoration-indigo-400 underline-offset-4 drop-shadow-lg">
                                            {survivorBuild.survivor.name}
                                        </span>
                                    </h2>
                                    <div className="relative z-10">
                                        <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                            Perks:
                                        </h3>
                                        <ul className="list-disc ml-6 space-y-2">
                                            {survivorBuild.perks?.map(
                                                (perk, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex items-start gap-3">
                                                        {perk.icon && (
                                                            <img
                                                                src={perk.icon}
                                                                alt={perk.name}
                                                                className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                                style={{
                                                                    marginTop: 6
                                                                }}
                                                            />
                                                        )}
                                                        <div>
                                                            <span className="font-black text-lg text-indigo-200 italic underline decoration-indigo-400 underline-offset-6 drop-shadow">
                                                                {perk.name}{" "}
                                                                {perk.owner
                                                                    ? `(${perk.owner})`
                                                                    : ""}
                                                            </span>
                                                            <div
                                                                className="text-sm text-gray-400 whitespace-pre-line"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: normaliseDescription(
                                                                        perk.description,
                                                                        false
                                                                    )
                                                                }}
                                                            />
                                                        </div>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div
                            className="col-span-2 w-full min-h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                            style={{
                                maxHeight: "850px",
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default CustomMatchBuilds;
