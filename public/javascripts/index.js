const defaultVersion = `1.14`;
const defaultLanguageCode = `uk_ua`;

const model = {
    version: defaultVersion,
    languageCode: defaultLanguageCode
};

const versions = {
    '1.14': {
        pack_format: 4,
    },
    '1.15': {
        pack_format: 5,
    }
}

let editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/json");
editor.resize();

document.getElementById('upload').addEventListener('change', handleFileSelect, false);
document.getElementById('save').addEventListener('click', onSaveResourcePack, false);
document.getElementById('versions').addEventListener('change', onVersionChange, false);
onVersionChange();

function onVersionChange(event) {
    let version = event ? event.target.value : defaultVersion;
    model.version = version;
    fetch(`./data/${version}/${defaultLanguageCode}.json`)
        .then(res => {
            if (res.status === 404)
                throw new Error(`Файл версії ${version} не знайдено`);
            return res.json();
        })
        .then(data => {
            editor.setValue(JSON.stringify(data, null, 4))
        })
        .catch(err => alert(`Помилка зміни версії: ${err}`));
}

function handleFileSelect(evt) {
    let files = evt.target.files; // FileList object

    // use the 1st file from the list
    f = files[0];

    let reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function (theFile) {
        return function (e) {
            //console.log(theFile, e.target)
            if (theFile.type === 'application/json') {
                editor.setValue(parse(e.target.result));
            } else { // zip
                let zip = new JSZip();
                zip.loadAsync(e.target.result, { base64: false })
                    .then(function (contents) {
                        // @todo check contents for this file
                        return Promise.all([
                            zip.file(`pack.mcmeta`).async('string'),
                            zip.file(`assets/minecraft/lang/${model.languageCode}.json`).async('string')
                        ]);
                    })
                    .then(([meta, lang]) => {
                        let metaJson = JSON.parse(meta);
                        if (metaJson.pack.pack_format !== 4) {
                            throw new Error('Ця версія Minecraft не підтримується')
                        }
                        // @todo save as loaded format and show update button on format mismatch
                        return lang;
                    })
                    .then(parse)
                    .then(editor.setValue.bind(editor))
                    .catch(err => alert(err));
            }
        };
    })(f);

    // Read in the image file as a data URL.
    if (f.type === 'application/json')
        reader.readAsText(f);
    else  // application/zip
        reader.readAsBinaryString(f)
}

function onSaveResourcePack(event) {
    try {
        let text = toUtf16Json(editor.getValue());
        let langKey = model.languageCode;
        let filename = `${langKey}.json`;
        let zip = new JSZip();
        let metaObject = {
            "pack": {
                "pack_format": versions[model.version].pack_format,
                "description": "Ukrainian language resource pack"
            },
            "language": {
                [langKey]: {
                    "name": "Ukrainian",
                    "region": "Ukraine",
                    "bidirectional": false
                }
            }
        };
        zip.file("pack.mcmeta", JSON.stringify(metaObject, null, 4));
        let langFolder = zip.folder("assets/minecraft/lang");
        langFolder.file(`${filename}`, text, { base64: false });
        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                download(content, `${model.languageCode}_resourcepack.zip`, "blob");
            })
            .catch(err => alert(`Помилка збереження ресурспаку: ${err}`));
    } catch (err) {
        alert(`Помилка створення ресурспаку: ${err}`)
    }

}

// Function to download data to a file
function download(data, filename, type) {
    let file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        let a = document.createElement("a");
        let url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function parse(text) {
    let originalText = text;
    let jsonObj = JSON.parse(originalText);
    let stringifiedText = JSON.stringify(jsonObj, null, 4);
    return stringifiedText;
}

function toUtf16Json(str) {
    let res = {};
    for (let [k, v] of Object.entries(JSON.parse(str))) {
        res[k] = toUnicode(v);
    }
    let text = JSON.stringify(res, null, 4);
    text = text.replace(/\\\\u/g, '\\u');
    return text;
}

function toUnicode(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        // Assumption: all characters are < 0xffff
        let code = str[i].charCodeAt(0);
        if (code > 127)
            result += "\\u" + ("000" + code.toString(16)).substr(-4);
        else
            result += str[i]
    }
    return result;
};