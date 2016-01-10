#!/usr/bin/node
var fs = require('fs');
var path = require('path');
var exec = require('sync-exec');
var db = require('sqlite-sync');
var cheerio = require('cheerio');

var lang = process.argv.slice(2)[0],
	version = '2.0',
	apiUrls = [
		`https://thinkjs.org/${lang}/doc/${version}/api_think.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_think_base.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_think_http_base.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_http.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_controller.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_controller_rest.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_model.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_model_mongo.html`,
		`https://thinkjs.org/${lang}/doc/${version}/api_middleware.html`
	];
var docset = {
	name: `ThinkJS-${lang}.docset`,
	path: path.join(__dirname, `ThinkJS-${lang}.docset`),
	resPath: path.join(__dirname, `ThinkJS-${lang}.docset/Contents/Resources`)
};
/** download all api html */
exec(`rm -rf ${docset.resPath}`);
exec(`mkdir -p ${docset.resPath}/Documents`);
apiUrls.forEach( url=> exec(`cd  ${docset.resPath}/Documents; wget ${url}`) );

/** create docset index */
fs.writeFile(
	`${docset.path}/Contents/Info.plist`,
	`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleIdentifier</key>
	<string>ThinkJS</string>
	<key>CFBundleName</key>
	<string>ThinkJS</string>
	<key>DocSetPlatformFamily</key>
	<string>ThinkJS</string>
	<key>isDashDocset</key>
	<true/>
	<key>dashIndexFilePath</key>
	<string>api_think.html</string>
</dict>
</plist>
	`
);

exec(`cp ${__dirname}/icon.png ${docset.path}`);

/** create index sqlite	 */
db.connect(`${docset.resPath}/docSet.dsidx`);
db.run(`CREATE TABLE searchIndex (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, path TEXT);`);
fs.readdirSync(`${docset.resPath}/Documents`).forEach(function(file) {
	var html = fs.readFileSync(`${docset.resPath}/Documents/${file}`, {encoding: 'utf8'});
	var $ = cheerio.load(html);
	var toc = $(".toc ul>li>a");
	var type = ({
		'zh-CN': {"属性": "Property", "方法": "Function", "类": "Class"},
		'en'   : {"Method": "Method", "Function": "Function", "Class": "Class"}
	})[lang], keywords = "Function";
	for(var i=0, l=toc.length; i<l; i++) {
		var item = $(toc[i]);
		if( type.hasOwnProperty( item.text() ) ) {
			keywords = type[item.text()];
			continue;
		}
		db.run(`INSERT INTO searchIndex (name, type, path) VALUES ('${item.text()}', '${keywords}', '${file}${item.attr("href")}')`);
	}
	$("title").html( $("title").html().replace(/\s+\-.+$/, '') );
	$(".header, .lbox, .r-fixed, .search, .toc, .footer").remove();
	fs.writeFileSync(`${docset.resPath}/Documents/${file}`, $.html());

});
