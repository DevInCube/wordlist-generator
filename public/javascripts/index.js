var editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/json");
editor.resize()

// does not work locally
fetch('./data/1.14/uk_ua.json')
    .then(res => res.json())
    .then(data => {
        editor.setValue(JSON.stringify(data, null, 4))
        //console.log(data)
    })
    .catch(err => console.error(err));

function toUnicode(str) {
    var result = "";
    for (var i = 0; i < str.length; i++) {
        // Assumption: all characters are < 0xffff
        let code = str[i].charCodeAt(0);
        if (code > 127)
            result += "\\u" + ("000" + code.toString(16)).substr(-4);
        else
            result += str[i]
    }
    return result;
};

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object

    // use the 1st file from the list
    f = files[0];

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function (theFile) {
        return function (e) {
            //console.log(theFile, e.target)
            if (theFile.type === 'application/json') {
                editor.setValue(parse(e.target.result));
            } else { // zip
                var zip = new JSZip();
                zip.loadAsync(e.target.result, { base64: false })
                    .then(function (contents) {
                        // @todo check contents for this file
                        zip.file('assets/minecraft/lang/uk_ua.json')
                            .async('string')
                            .then(parse)
                            .then(val => editor.setValue(val))
                            .catch(err => alert(err))
                    });
            }
        };
    })(f);

    // Read in the image file as a data URL.
    if (f.type === 'application/json')
        reader.readAsText(f);
    else
        reader.readAsBinaryString(f)
}

function parse(text) {
    let originalText = text;
    let jsonObj = JSON.parse(originalText);
    let stringifiedText = JSON.stringify(jsonObj, null, 4);
    return stringifiedText;
}

document.getElementById('upload').addEventListener('change', handleFileSelect, false);
document.getElementById('save').addEventListener('click', function (e) {
    try {
        let text = editor.getValue();
        let res = {};
        for (let [k, v] of Object.entries(JSON.parse(text))) {
            res[k] = toUnicode(v);
        }
        text = JSON.stringify(res, null, 4);
        text = text.replace(/\\\\u/g, '\\u');
        //download(text, filename, "text")
        let langKey = `uk_ua`;
        let filename = `${langKey}.json`;
        var zip = new JSZip();
        let metaObject = {
            "pack": {
                "pack_format": 4,  // 1.14
                "description": "UA fixed"
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
        var langFolder = zip.folder("assets/minecraft/lang");
        langFolder.file(`${filename}`, text, { base64: false });
        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                download(content, "pack.zip", "blob");
            })
            .catch(err => alert(`Помилка: ${err}`));
    } catch (err) {
        alert(`Помилка: ${err}`)
    }

}, false);



// Function to download data to a file
function download(data, filename, type) {
    var file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
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