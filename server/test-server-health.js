const { spawn } = require('child_process');
const http = require('http');

console.log('Starting server...');
const server = spawn('node', ['index.js'], { cwd: 'c:/Users/FYPH/Tweety/server' });

server.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log('SERVER STDOUT:', msg);
});

server.stderr.on('data', (data) => {
    console.log('SERVER STDERR:', data.toString());
});

setTimeout(() => {
    console.log('Testing health check...');
    const req = http.get('http://127.0.0.1:3001/health', (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log('HEALTH RESPONSE:', body);
            server.kill();
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error('HEALTH REQUEST ERROR:', e.message);
        server.kill();
        process.exit(1);
    });
}, 5000);
