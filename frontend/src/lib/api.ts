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

export async function* postStream(path: string, body: any) {
    const idToken = localStorage.getItem('idToken');
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;

    console.log('Making request to:', url);
    console.log('With token:', idToken ? 'Present' : 'Missing');
    console.log('Request body:', body);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify(body),
        });

        console.log('Response status:', res.status);
        console.log('Response ok:', res.ok);

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        if (!res.body) throw new Error('No response body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = '';
        while (!done) {
            const { value, done: d } = await reader.read();
            done = d;
            if (value) buffer += decoder.decode(value);
            let lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        yield JSON.parse(line);
                    } catch (parseError) {
                        console.error('Failed to parse JSON line:', line, parseError);
                    }
                }
            }
        }
    } catch (error) {
        console.error('postStream error:', error);
        throw error;
    }
}