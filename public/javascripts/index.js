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

String.prototype.toUnicode = function () {
    var result = "";
    for (var i = 0; i < this.length; i++) {
        // Assumption: all characters are < 0xffff
        let code = this[i].charCodeAt(0);
        if (code > 127)
            result += "\\u" + ("000" + code.toString(16)).substr(-4);
        else
            result += this[i]
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

            let originalText = e.target.result;
            let jsonObj = JSON.parse(originalText);
            let stringifiedText = JSON.stringify(jsonObj, null, 4);
            editor.setValue(stringifiedText);
        };
    })(f);

    // Read in the image file as a data URL.
    reader.readAsText(f);
}

document.getElementById('upload').addEventListener('change', handleFileSelect, false);
document.getElementById('save').addEventListener('click', function (e) {
    try {
        let text = editor.getValue();
        let res = {};
        for (let [k, v] of Object.entries(JSON.parse(text))) {
            res[k] = v.toUnicode();
        }
        text = JSON.stringify(res, null, 4);
        text = text.replace(/\\\\u/g, '\\u');
        //download(text, filename, "text")
        let langKey = `uk_ua`;
        let filename = `${langKey}.json`;
        var zip = new JSZip();
        let metaObject = {
            "pack": {
                "pack_format": 4,
                "description": "UA fixed"
            },
            "language": {
                [langKey]: {
                    "name": "Tutorial Language",
                    "region": "Country/region name",
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