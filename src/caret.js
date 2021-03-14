export const getCaretPosition = (type = 'start') => {
    let selection = window.getSelection();
    let range = selection.getRangeAt(0);
    let currentRange = range.cloneRange();

    if (type === 'end') {
        selection.collapseToSEnd();
    } else {
        selection.collapseToStart();
    }

    let currentNode;
    let position = 0;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        for (let x = 0; x < block.nodes.length; x++) {
            const node = block.nodes[x];
            if (selection.anchorNode === node.element) {
                currentNode = node.element;
                position += range.startOffset;
                break;
            }
            position += node.value.length;
        }
        if (currentNode) {
            break;
        }
    }

    selection.removeAllRanges();
    selection.addRange(currentRange);

    return position;
}

export const setCaretPosition = (index) => {
    let currentCharCount = index;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        for (let x = 0; x < block.nodes.length; x++) {
            const node = block.nodes[x];
            currentCharCount -= node.value.length;

            if (currentCharCount < 0) {
                currentCharCount += node.value.length;
                currentCharCount;

                let range = document.createRange();
                let selection = window.getSelection();

                range.setStart(node.element, currentCharCount);
                range.collapse(true);

                selection.removeAllRanges();
                selection.addRange(range);

                i = blocks.length;
                return;
            }
        };
    };
};