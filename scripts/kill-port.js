const { execSync } = require('child_process');

const PORT = 8181;

try {
    const output = execSync(`netstat -ano | findstr :${PORT}`).toString();
    const lines = output.trim().split('\n');
    const pids = new Set();

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
            pids.add(pid);
        }
    });

    pids.forEach(pid => {
        try {
            console.log(`Killing process ${pid} on port ${PORT}...`);
            execSync(`taskkill /F /PID ${pid}`);
        } catch (e) {
            // Ignore errors if process already dead
        }
    });
} catch (error) {
    // findstr returns exit code 1 if no matches found, which execSync throws as error
    console.log(`Port ${PORT} is already free.`);
}
