import React from 'react';
import ReactDOM from 'react-dom/client';
import { EditorProvider } from './contexts/EditorContext';
import Layout from './components/Layout';
import './index.css';

function App() {
    console.log('App component rendering...');
    return (
        <EditorProvider>
            <div className="h-full w-full bg-[#1e1e1e] text-white">
                <Layout />
            </div>
        </EditorProvider>
    );
}

export default App;
