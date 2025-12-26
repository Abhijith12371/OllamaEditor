import React from 'react';
import ReactDOM from 'react-dom/client';
import { EditorProvider } from './contexts/EditorContext';
import Layout from './components/Layout';
import './index.css';

function App() {
    return (
        <EditorProvider>
            <Layout />
        </EditorProvider>
    );
}

export default App;
