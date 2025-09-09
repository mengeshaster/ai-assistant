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

// Simplified streaming function using fetch
export async function* postStream(path: string, body: any) {
    const idToken = localStorage.getItem('idToken');
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;

    console.log('Starting stream request to:', url);
    console.log('With token:', idToken ? 'Present' : 'Missing');
    console.log('Request body:', body);

    if (!idToken) {
        throw new Error('No authentication token found. Please log in.');
    }

    try {
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

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                console.log('Stream ended');
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            console.log('Received buffer chunk:', buffer);

            // Process SSE events (each event ends with \n\n)
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep incomplete event in buffer

            for (const event of events) {
                if (event.trim()) {
                    console.log('Processing event:', event);
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
                            const parsedData = JSON.parse(data);
                            console.log('Yielding parsed data:', parsedData);
                            yield parsedData;
                        } catch (parseError) {
                            console.warn('Failed to parse JSON, yielding as text:', data);
                            yield { type: 'text', data: data };
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Stream error:', error);
        throw error;
    }
}