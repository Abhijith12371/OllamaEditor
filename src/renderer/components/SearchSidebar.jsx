import React, { useState } from 'react';
import { useEditor } from '../contexts/EditorContext';
import { ChevronRight, ChevronDown } from 'lucide-react';

const SearchSidebar = () => {
    const { currentFolder, openFile } = useEditor();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (e) => {
        if (e.key === 'Enter' && query.trim() && currentFolder) {
            setSearching(true);
            setResults([]);
            if (window.electronAPI) {
                const matches = await window.electronAPI.searchInFiles(currentFolder, query);
                setResults(matches || []);
            }
            setSearching(false);
        }
    };

    // Group results by file
    const groupedResults = results.reduce((acc, curr) => {
        if (!acc[curr.file]) acc[curr.file] = [];
        acc[curr.file].push(curr);
        return acc;
    }, {});

    const ResultItem = ({ filePath, matches }) => {
        const [expanded, setExpanded] = useState(true);
        const fileName = filePath.split(/[\\/]/).pop();
        const relativePath = filePath.replace(currentFolder, '').replace(/^[\\/]/, '');

        return (
            <div className="mb-1">
                <div
                    className="flex items-center px-4 py-1 cursor-pointer hover:bg-[#2a2d2e] text-gray-300 text-sm font-semibold"
                    onClick={() => setExpanded(!expanded)}
                >
                    <span className="mr-1">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                    <span className="truncate" title={relativePath}>{fileName}</span>
                    <span className="ml-2 text-xs text-gray-500 bg-gray-800 px-1.5 rounded-full">{matches.length}</span>
                </div>
                {expanded && (
                    <div>
                        {matches.map((match, idx) => (
                            <div
                                key={idx}
                                className="px-8 py-0.5 cursor-pointer hover:bg-[#37373d] text-xs text-gray-400 font-mono truncate"
                                onClick={() => openFile(filePath, fileName)}
                                title={match.content}
                            >
                                <span className="text-gray-500 mr-2">{match.line}:</span>
                                {match.content.trim()}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 pb-2">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleSearch}
                        placeholder="Search"
                        className="w-full bg-[#3c3c3c] text-[#cccccc] border border-[#3c3c3c] focus:border-[#007fd4] outline-none px-2 py-1 text-sm rounded-sm placeholder-gray-500"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {searching && <div className="p-4 text-xs text-center text-gray-500">Searching...</div>}

                {!searching && results.length === 0 && query && (
                    <div className="p-4 text-xs text-center text-gray-500">No results found.</div>
                )}

                {!searching && Object.keys(groupedResults).map(file => (
                    <ResultItem key={file} filePath={file} matches={groupedResults[file]} />
                ))}
            </div>
        </div>
    );
};

export default SearchSidebar;
