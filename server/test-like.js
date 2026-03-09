async function testLike() {
    const url = 'http://127.0.0.1:3001/likes';
    const payload = {
        post_id: 'e6bca232-a50e-43f1-9c86-1d184400e9f6', // Need a real ID or just a string
        user_id: 'd9bba111-a111-4111-b111-c111d111e111',
        username: 'tester'
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        console.log('Response:', json);
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testLike();
