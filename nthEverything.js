String.prototype.hashCode = function(){
    if (Array.prototype.reduce){
        return this.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
    } 
    var hash = 0;
    if (this.length === 0) return hash;
    for (var i = 0; i < this.length; i++) {
        var character  = this.charCodeAt(i);
        hash  = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
} 


var styleSuffix = "-nthEvery",
cssPattern = /\s*(.*?)\s*\{(.*?)\}/g,
cssComments = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
partsPattern = /([^:]+)/g,
nthPattern = /(\w*)-(\w*)(\((even|odd|[\+-n\d]{1,6})\))?/,
wordSpacePattern = /(\s*[^ ]+\s*)/g,
wordSimplePattern = /\s+/,
count,
// To store the style per Selector
parsedStyleMap = {},
// CSS for the classes
genCSS = '',
runPeriods = function(period, className, a, length, offset) {
    var inBy = 0,
        sAt = +period,
        matches,
        n, zB, zE, bF, eF, oldN = -1;

    if (period === 'odd' || period === 'even') {
        sAt = (period === 'odd') ? 1 : 2;
        inBy = 2;
    } else if (/^\d+$/.test(period)) {
        sAt = period - offset;
        inBy = 0;
    } else {
        zB = /^(\+|-)?\d+/.exec(period);
        zE = /(\+|-)?\d+$/.exec(period);

        sAt = (zE) ? +(zE[0]) : 1;
        inBy = (zB) ? +(zB[0]) : 1;

        bF = (zB) ? zB.length - 1 : 0;
        eF = (zE) ? zE.length : 0;
        if ((period.substr(bF, period.length - eF - bF).charAt(0)) === '-') {
            inBy *= -1;
        }
    }

    // Start index at 0;
    sAt--;

    for (n = sAt; n < length; n += inBy) {
        if (n < 0 || n === oldN) break;
        if (a[n] === undefined) {
            a[n] = className;
        } else {
            a[n] += " " + className;
        }
        oldN = n;
    }
},

createSpan = function(className, content) {
    return '<span class="'+className+'">'+content+'</span>'; 
    /*
    let span = document.createElement('span');
    className.split(' ').map(c=>{span.classList.add(c)});
    span.innerText = content;
    return span;
    */
},


processPeriod = function(classNames, textArray) {
    var newText = '',
        n, className;
    for (n = 0; n < classNames.length; n++) {
        className = classNames[n];
        if (className === undefined) {
            newText += textArray[n];
        } else {
            newText += createSpan(className, textArray[n]);
        }
    }
    let html = new DOMParser().parseFromString(newText, "text/html").children[0];
    let div = document.createElement('div');
    div.innerHTML = html.querySelector('body').innerHTML;
    return div;
},

getClassNames = function(parsedStyle, length, pFunc) {
    var classNames = new Array(length),
        i;
    for (i = 0; i < parsedStyle.period.length; i++) {
        runPeriods(pFunc(parsedStyle.period[i], length), parsedStyle.className[i], classNames, length);
    }
    return classNames;
},

prepareTxt = {
    word: function(text) {
        return text.match(wordSpacePattern);
    },
    letter: function(text) {
        return text.split('');
    }
},

pseudoFunc = {
    first: {
        word: function(period) {
            if (period === 'firstword') return 1;
        },
        letter: function(period) {
            if (period === 'firsletter') return 1;
        }
    },
    last: {
        word: function(period, allText, length) {
            if (period === 'lastword') period = '' + allText.match(wordSpacePattern).length;
            return period;
        },
        letter: function(period, allText, length) {
            if (period === 'lastletter') return length;
        },
    },
    nth: {
        letter: function(period) {
            return period;
        },
        word: function(period) {
            return period;
        }
    }
},

loopRecursive = function(contents, allText, parsedStyle) {
    var func = parsedStyle.func,
        text, length, classNames, className, cat, period;
    contents.map(function(item) {
        if (item.children.lenght > 0) {
            loopRecursive(Array.from(item.children), allText, parsedStyle);
        } else if (typeof prepareTxt[func] == 'function') {
            text = prepareTxt[func](item.innerText);
            length = text.length;
            classNames = new Array(length);
            for (var i = 0; i < parsedStyle.period.length; i++) {
                className = parsedStyle.className[i];
                cat = parsedStyle.cat[i];
                period = parsedStyle.period[i];
                runPeriods(pseudoFunc[cat][func](period, allText, length), className, classNames, length, count);
            }

            item.replaceWith(processPeriod(classNames, text) );

            count += length;
        }
    });
    return count;
},

parse = function(css) {
    try {
        var matches, nthMatch, nthFound = false,
            i, thisPeriod, selectors, style, selector, parts, nth, pseudo, cat, func, period, normSelector, ident, className;


        css = css.replace(cssComments, '$1').replace(/\n|\r/g, '');

        while ((matches = cssPattern.exec(css)) !== null) {
            selectors = matches[1].split(',');
            style = matches[2];
            for (i = 0; i < selectors.length; i++) {
                selector = selectors[i];
                parts = selector.match(partsPattern);
                if (parts) {
                    selector = parts.shift();
                    nth = parts.shift();
                    pseudo = (parts.length !== 0) ? ':' + parts.join(':') : '';
                    let pass = false;
                    if (nth) ['-letter','-word'].map(s=>{ if (!pass) pass = nth.indexOf(s)!=-1 });
                    if ((nthMatch = nthPattern.exec(nth)) !== null && pass) {
                        nthFound = true;
                        console.log([nth, nthMatch]);
                        cat = nthMatch[1];
                        func = nthMatch[2];
                        period = (nthMatch[4] !== undefined) ? nthMatch[4] : cat + func;
                        console.log(['period', period]);
                        normSelector = selector.replace('#', '').replace('.', '');
                        let token = normSelector.hashCode();
                        ident = normSelector + func;
                        className = ident +'_'+ token;

                        if ((thisPeriod = parsedStyleMap[ident]) !== undefined) {
                            thisPeriod.className.push(className);
                            thisPeriod.period.push(period);
                            thisPeriod.style.push(style);
                            thisPeriod.pseudo.push(pseudo);
                            thisPeriod.cat.push(cat);
                        } else {
                            parsedStyleMap[ident] = {
                                element: selector.replace(/{}/gm,"$1"),
                                func: func,
                                className: [className],
                                cat: [cat],
                                period: [period],
                                style: [style],
                                pseudo: [pseudo]
                            };
                        }
                    }
                } else if (nthFound === true) {
                    genCSS += selector + "{" + style + "}"; // Fix chained selectors.
                }
            }
        }
    } catch(e) {
        console.info(['nthEverything Error', e]);
    }
},

loadStyles = async function() {
    try {
        // Build CSS Rules
        Array.from(document.querySelectorAll('link[rel=stylesheet]') ).map(async item=>{
            let resp = await fetch(item.href);
            if (resp.ok) {
                const css = await resp.text();
                if (css.length>0) parse( css );
            }
        });

        Array.from(document.querySelectorAll('style') ).map(item=>{
            parse(item.innerText);
        });
    } catch(e) {
        console.info(['nthEverything Error', e]);
    }
};


applyStyles = function() {
    try {
        var id, parsedStyle, func, b;
        for (id in parsedStyleMap) {
            parsedStyle = parsedStyleMap[id];
            func = parsedStyle.func;

            Array.from(document.querySelectorAll(parsedStyle.element)).map(function($this) {
                count = 0; // Set to 0. We use a recursive Loop here
                loopRecursive([$this], $this.innerText, parsedStyle);
            });

            for (b = 0; b < parsedStyle.className.length; b++) {
                genCSS += "." + parsedStyle.className[b] + parsedStyle.pseudo[b] + "{" + parsedStyle.style[b] + "}";
            }
        }

        let style = document.createElement('style');
        style.innerHTML = genCSS;
        document.querySelector('head').appendChild(style);
    } catch(e) {
        console.log(['nthEverything Error', e]);
    }
};




// Apply Styles.
window.onload = () => { 
    loadStyles();
    applyStyles();
}
