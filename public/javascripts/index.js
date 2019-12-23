const defaultPackFormat = 4;
const defaultVersion = `1.14`;
const defaultLanguageCode = `uk_ua`;

const model = {
    input_type: `type_new`,
    languageCode: defaultLanguageCode,
    uploaded: {
        filename: ``,
        pack_format: defaultPackFormat,
        lang: ``,
    },
    current: {
        lang: ``,
    }
};

const formats = [
    { pack_format: 4, versions: ['1.13', '1.14'] },
    { pack_format: 5, versions: ['1.15'] },
];
const defaultFormat = formats.find(x => x.pack_format === defaultPackFormat);

let editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/json");
editor.resize();

document.getElementById('type_new').addEventListener('click', onVersionChange, false)
document.getElementById('type_upload').addEventListener('click', onUploaded, false)
document.getElementById('download_format').addEventListener('click', onDownloadVersionChange, false)
document.getElementById('upload').addEventListener('change', handleFileSelect, false);
document.getElementById('save').addEventListener('click', onSaveResourcePack, false);
document.getElementById('new_format').addEventListener('change', onVersionChange, false);
onVersionChange();

function onDownloadVersionChange(event) {
    let downloadVersion = document.getElementById('download_format').value
    try {
        let currentJson = JSON.parse(model.current.lang);
        fetchLangFileJson(downloadVersion, model.languageCode)
            .then(selectedJson => {
                let newJson = Object.assign({}, selectedJson, currentJson);
                editor.setValue(JSON.stringify(newJson, null, 4))
            })
            .catch(err => alert(err));
    } catch (err) {
        alert(err);
    }
}

function onUploaded(event) {
    if (model.uploaded.lang)
        editor.setValue(parse(model.uploaded.lang))
    else
        editor.setValue('')
    let versions = formats.find(x => x.pack_format === model.uploaded.pack_format).versions
    let version = versions[versions.length - 1];  // take latest version
    document.querySelector(`#download_format option[value='${version}']`).selected = true;
}

function fetchLangFileJson(version, langCode = defaultLanguageCode) {
    return fetch(`./data/${version}/${langCode}.json`)
        .then(res => {
            if (res.status === 404)
                throw new Error(`Файл версії ${version} не знайдено`);
            return res.json();
        });
}

function onVersionChange(event) {
    let version = document.getElementById('new_format').value;
    let format = formats.find(x => x.versions.includes(version));
    if (!format)
        return alert(`Unsuppported version: ${version}`);
    model.version = version;
    fetchLangFileJson(version, model.languageCode)
        .then(data => {
            let text = JSON.stringify(data, null, 4);
            editor.setValue(text)
            model.current.lang = text;
            document.getElementById('type_new').checked = true;
            model.input_type = 'type_new';
            document.querySelector(`#download_format option[value='${version}']`).selected = true;
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
                        let uploadFormat = metaJson.pack.pack_format;
                        let format = formats.find(x => x.pack_format === uploadFormat);
                        if (!format) {
                            throw new Error('Ця версія Minecraft не підтримується')
                        }
                        document.querySelector(`#upload_format option[value='${uploadFormat}']`).selected = true;
                        let version = format.versions[format.versions.length - 1]
                        document.querySelector(`#download_format option[value='${version}']`).selected = true;
                        //
                        model.uploaded.filename = theFile.name
                        model.uploaded.pack_format = uploadFormat
                        model.uploaded.lang = lang;
                        model.current.lang = lang;
                        //
                        onDownloadVersionChange()
                    })
                    .catch(err => alert(err));
            }
            document.getElementById('type_upload').checked = true;
            model.input_type = 'type_upload';
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
        let text = editor.getValue();
        if (!text) 
            throw new Error(`Пусто`);
        let currentJson = JSON.parse(text);
        let downloadVersion = document.getElementById('download_format').value
        fetchLangFileJson(downloadVersion, model.languageCode)
            .then(selectedJson => {
                let newJson = Object.assign({}, selectedJson, currentJson);
                let text = toUtf16Json(newJson);
                let langKey = model.languageCode;
                let filename = `${langKey}.json`;
                let zip = new JSZip();
                let metaObject = {
                    "pack": {
                        "pack_format": formats.find(x => x.versions.includes(downloadVersion)).pack_format,
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
                return zip.generateAsync({ type: "blob" })
            })
            .then(function (content) {
                let filename = (model.type === `type_new` || model.uploaded.filename === '')
                    ? `${model.languageCode}_resourcepack.zip`
                    : model.uploaded.filename
                download(content, filename, "blob");
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

function toUtf16Json(jsonObj) {
    let res = {};
    for (let [k, v] of Object.entries(jsonObj)) {
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