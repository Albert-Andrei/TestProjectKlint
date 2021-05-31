const mySubstring = {};

mySubstring.sub = (string) => {
    return string.replace(/s*\([^)]*\)/g, '');
};

module.exports = mySubstring;