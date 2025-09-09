import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is already authenticated
        const token = localStorage.getItem('idToken');
        if (token) {
            // If authenticated, redirect to chat
            router.replace('/chat');
        } else {
            // If not authenticated, redirect to login
            router.replace('/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        </div>
    );
}
