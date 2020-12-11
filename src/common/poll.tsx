import { useEffect, useRef } from 'react';

// Temporary code to simulate interval-based polling
type IntervalFunction = () => ( unknown | void )

function useInterval(callback: any, delay: number) {
    const cb = useRef<IntervalFunction| null>();

    // Remember the latest callback.
    useEffect(() => {
        cb.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            if ( cb.current != null ) {
                cb.current();
            }
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

export default useInterval;
