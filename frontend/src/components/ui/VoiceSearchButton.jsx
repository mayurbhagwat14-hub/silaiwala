import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { toast } from 'react-hot-toast';

const getRecognitionCtor = () =>
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * Mic button for search inputs, using the browser's Web Speech API.
 * Live words are sent to `onTranscript`; the final phrase goes to `onFinal` (e.g. to run the search).
 */
const VoiceSearchButton = ({ onTranscript, onFinal, lang = 'en-IN', className = '', size = 18 }) => {
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef(null);
    const finalRef = useRef('');

    useEffect(() => () => recognitionRef.current?.abort?.(), []);

    const start = () => {
        const Ctor = getRecognitionCtor();
        if (!Ctor) {
            toast.error('Voice search is not supported in this browser. Try Chrome.');
            return;
        }

        const recognition = new Ctor();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        finalRef.current = '';

        recognition.onresult = (event) => {
            const text = Array.from(event.results).map((r) => r[0].transcript).join('').trim();
            finalRef.current = text;
            onTranscript?.(text);
        };
        recognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                toast.error('Please allow microphone access to use voice search.');
            } else if (event.error === 'no-speech') {
                toast('Didn\'t catch that. Please try again.');
            } else if (event.error !== 'aborted') {
                toast.error('Voice search failed. Please try again.');
            }
        };
        recognition.onend = () => {
            setListening(false);
            recognitionRef.current = null;
            if (finalRef.current) onFinal?.(finalRef.current);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
            setListening(true);
        } catch {
            setListening(false);
        }
    };

    const stop = () => recognitionRef.current?.stop();

    return (
        <button
            type="button"
            onClick={listening ? stop : start}
            aria-label={listening ? 'Stop voice search' : 'Search by voice'}
            title={listening ? 'Listening… tap to stop' : 'Search by voice'}
            className={`relative flex shrink-0 items-center justify-center rounded-full transition-colors ${
                listening ? 'bg-red-500 text-white' : 'text-[#843D9B] hover:bg-[#843D9B]/10'
            } ${className}`}
        >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />}
            <Mic size={size} className="relative" />
        </button>
    );
};

export default VoiceSearchButton;
