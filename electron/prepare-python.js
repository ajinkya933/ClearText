const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function downloadFile(url, dest) {
    console.log(`Downloading from ${url} to ${dest}`);
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Successfully downloaded ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            console.error(`Error downloading ${url}:`, err);
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function preparePython() {
    try {
        console.log('Starting Python environment setup...');
        // Use the electron directory for python-embedded
        const pythonDir = path.join(__dirname, 'python-embedded');
        // Reference the parent directory for project files
        const projectDir = path.join(__dirname, '..');
        
        // Clean existing directory if it exists
        if (fs.existsSync(pythonDir)) {
            console.log('Removing existing python-embedded directory...');
            fs.rmSync(pythonDir, { recursive: true, force: true });
        }
        
        fs.mkdirSync(pythonDir, { recursive: true });
        console.log('Created python-embedded directory');

        // Download and extract Python
        const pythonVersion = '3.9.0';
        await downloadFile(`https://www.python.org/ftp/python/${pythonVersion}/python-${pythonVersion}-embed-amd64.zip`, 'python.zip');
        
        console.log('Extracting Python...');
        execSync(`powershell -command "Expand-Archive -Path python.zip -DestinationPath ${pythonDir} -Force"`, 
            { stdio: 'inherit' });
        fs.unlinkSync('python.zip');

        // Modify python*._pth file to enable site packages
        const pthFile = fs.readdirSync(pythonDir)
            .find(file => file.endsWith('._pth'));
        const pthPath = path.join(pythonDir, pthFile);
        
        console.log('Modifying PTH file to enable site packages...');
        let pthContent = fs.readFileSync(pthPath, 'utf8');
        pthContent = pthContent.replace('#import site', 'import site');
        fs.writeFileSync(pthPath, pthContent);

        // Download and install pip
        console.log('Setting up pip...');
        await downloadFile('https://bootstrap.pypa.io/get-pip.py', 'get-pip.py');
        
        const pythonExe = path.join(pythonDir, 'python.exe');
        execSync(`"${pythonExe}" get-pip.py --no-warn-script-location`, { stdio: 'inherit' });
        fs.unlinkSync('get-pip.py');

        // Add Scripts directory to PATH temporarily
        const scriptsDir = path.join(pythonDir, 'Scripts');
        process.env.PATH = `${scriptsDir};${process.env.PATH}`;

        // Install dependencies - refer to requirements.txt in the parent directory
        console.log('Installing dependencies...');
        const commands = [
            // First upgrade pip
            `"${pythonExe}" -m pip install --upgrade pip`,
            
            // Install torch CPU version
            `"${pythonExe}" -m pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu`,
            
            // Install main requirements from parent directory
            `"${pythonExe}" -m pip install --no-cache-dir -r "${path.join(projectDir, 'requirements.txt')}"`,
            
            // Install specific packages
            `"${pythonExe}" -m pip install --no-deps craft-text-detector==0.4.3`,
            `"${pythonExe}" -m pip install gdown==5.2.0`,
            `"${pythonExe}" -m pip install opencv-python==4.11.0.86`
        ];

        for (const command of commands) {
            console.log(`Running: ${command}`);
            execSync(command, { 
                stdio: 'inherit',
                env: {
                    ...process.env,
                    PYTHONPATH: path.join(pythonDir, 'Lib', 'site-packages')
                }
            });
        }
        
        // Copy project files from parent directory to site-packages
        const sitePackagesDir = path.join(pythonDir, 'Lib', 'site-packages');
        
        // List of project files to copy
        const projectFiles = [
            'craft_utils.py',
            'imgproc.py',
            'file_utils.py',
            'craft.py'
            // Add any other project-specific modules here
        ];
        
        for (const file of projectFiles) {
            const sourcePath = path.join(projectDir, file);
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, path.join(sitePackagesDir, file));
                console.log(`Copied ${file} to site-packages`);
            } else {
                console.warn(`WARNING: ${file} not found in project root!`);
            }
        }

        console.log('Python environment setup complete!');
        console.log('Contents of python-embedded directory:');
        execSync(`dir "${pythonDir}"`, { stdio: 'inherit' });

    } catch (error) {
        console.error('Error during Python setup:', error);
        throw error;
    }
}

preparePython().catch(error => {
    console.error('Failed to prepare Python:', error);
    process.exit(1);
}); 