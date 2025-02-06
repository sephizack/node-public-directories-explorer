import Logger from './modules/logger.js'
import express from 'express'
import config from 'config';
import serveIndex from 'serve-index';
import auth from 'basic-auth'
const app = express();

if (!config.has("serverPort")) {
    Logger.warning("You must provide the config 'serverPort'")
    process.exit(1);
}
if (!config.has("publicDirectories")) {
    Logger.warning("You must provide the config 'publicDirectories'")
    process.exit(1);
}

// Setup Authentication
if (config.has('credentials')) {
    let credentials = config.get('credentials')
	if (credentials !== false) {
		app.use(function (request, response, next) {
			var user = auth(request)
			if (!user || !credentials.name || credentials.password !== user.pass) {
				response.set('WWW-Authenticate', `Basic realm="${credentials.realm}"`)
				return response.status(401).send()
			}
			return next()
		})
	}
}

// Set headers Expire 
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    next();
});

// Expose directories
for (let directory of config.get("publicDirectories")) {
    Logger.info(`Serve '${directory["localPath"]}' at http://localhost:${config.get("serverPort")}/${directory["urlPath"]} ...`);
    app.use(
        directory["urlPath"],
        express.static(directory["localPath"]),
        serveIndex(directory["localPath"], {
            'icons': true,
            'stylesheet': './public/style.css',
            "filter": (filename, index, files, dir) => {
                if (dir.indexOf("/@") !== -1) {
                    return false
                }
                if (filename.indexOf("@") == 0) {
                    return false
                }
                return true
            },
            'view':'details'
        })
    )
}

// Start server
app.listen(config.get("serverPort"), err => {
    if (err) {
        return Logger.error(err);
    }
    Logger.info(`Server is listening on port ${config.get("serverPort")}`);
});
