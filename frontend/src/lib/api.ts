const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bhrw5dk8h8.execute-api.eu-north-1.amazonaws.com';

export async function postRequest(path: string, body: any) {
    const idToken = localStorage.getItem('idToken');
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;

    console.log('Making non-streaming request to:', url);
    console.log('With token:', idToken ? 'Present' : 'Missing');

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(body),
    });

    console.log('Response status:', res.status);

    if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    return await res.json();
}

// True Server-Sent Events (SSE) with EventSource
export async function* postStreamSSE(path: string, body: any) {
    const idToken = localStorage.getItem('idToken');

    console.log('Starting SSE stream for:', path);
    console.log('With token:', idToken ? 'Present' : 'Missing');
    console.log('Request body:', body);

    return new Promise<AsyncGenerator<any>>((resolve, reject) => {
        // For SSE with POST data, we need to send the data first, then connect to stream
        // This is a common pattern where we initiate with POST, then get a stream URL

        // For now, let's use the fetch approach but format for SSE
        const generator = async function* () {
            try {
                const url = path.startsWith('http') ? path : `${API_URL}${path}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                }

                if (!response.body) throw new Error('No response body');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Process SSE events (each event ends with \n\n)
                    const events = buffer.split('\n\n');
                    buffer = events.pop() || ''; // Keep incomplete event in buffer

                    for (const event of events) {
                        if (event.trim()) {
                            const lines = event.split('\n');
                            let data = '';
                            let eventType = 'message';

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    data = line.slice(6);
                                } else if (line.startsWith('event: ')) {
                                    eventType = line.slice(7);
                                }
                            }

                            if (data) {
                                try {
                                    yield JSON.parse(data);
                                } catch (parseError) {
                                    // If it's not JSON, yield as text
                                    yield { type: 'text', data: data };
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('SSE Stream error:', error);
                throw error;
            }
        };

        resolve(generator());
    });
}

// Keep the old function for compatibility - now uses SSE
export async function* postStream(path: string, body: any) {
    const sseGenerator = await postStreamSSE(path, body);
    yield* sseGenerator;
}