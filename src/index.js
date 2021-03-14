window.RichTextEditor = (element) => {
    let value = element.value;

    let caretPosition = {
        anchor: null,
        focus: null
    };

    let editor;
    let editorContent;

    let blocks = [];

    const buildHtml = () => {
        let container = document.createElement('div');

        blocks.forEach(block => {
            const newBlock = document.createElement(block.type);

            block.nodes.forEach(node => {
                const newNode = document.createTextNode(node.value)
                newBlock.append(newNode);
            });


            container.append(newBlock);
        });

        return container.innerHTML;
    };

    const getCaretPosition = () => {
        let selection = window.getSelection();

        let position = 0;

        caretPosition = {
            anchor: null,
            focus: null
        };

        for (let i = 0; i < blocks.length; i++) {
            if (i > 0) {
                position++;
            }

            const block = blocks[i];
            for (let x = 0; x < block.nodes.length; x++) {
                const node = block.nodes[x];
                if (selection.anchorNode === node.element) {
                    caretPosition.anchor = position + selection.anchorOffset;
                }
                if (selection.focusNode === node.element) {
                    caretPosition.focus = position + selection.focusOffset;
                }

                if (caretPosition.anchor != null && caretPosition.focus != null) {
                    break;
                }

                position += node.value.length;
            }

            if (caretPosition.anchor != null && caretPosition.focus != null) {
                break;
            }
        }

        return caretPosition;
    };

    const setCaretPosition = (focusIndex = false, anchorIndex = false) => {
        if (focusIndex !== false && anchorIndex === false) {
            anchorIndex = focusIndex;

        } else if (focusIndex === false) {
            focusIndex = caretPosition.focus;
            anchorIndex = caretPosition.anchor;
        }

        let range = document.createRange();
        let selection = window.getSelection();

        const { node: focusNode, position: focusPosition } = getCaretPositionInfo(focusIndex);
        range.setEnd(focusNode.element, focusPosition);

        const { node: anchorNode, position: anchorPosition } = getCaretPositionInfo(anchorIndex);
        range.setStart(anchorNode.element, anchorPosition);

        selection.removeAllRanges();
        selection.addRange(range);
    };

    const deleteSelected = () => {
        let firstCaret = Math.min(caretPosition.anchor, caretPosition.focus);
        let lastCaret = Math.max(caretPosition.anchor, caretPosition.focus);

        let position = 0;

        let firstPosition;
        let lastPosition;

        let firstBlock;
        let lastBlock;

        for (let i = 0; i < blocks.length; i++) {
            if (i > 0) {
                position++;
            }

            const block = blocks[i];
            for (let x = 0; x < block.nodes.length; x++) {
                const node = block.nodes[x];
                position += node.value.length;

                let firstCaretInNode = false;
                let lastCaretInNode = false;

                if (firstPosition == null && position >= firstCaret) {
                    firstBlock = i;
                    firstCaretInNode = true;
                    firstPosition = firstCaret - (position - node.value.length);
                }

                if (lastPosition == null && position >= lastCaret) {
                    lastBlock = i;
                    lastCaretInNode = true;
                    lastPosition = lastCaret - (position - node.value.length);
                }

                if (firstPosition != null) {
                    if (firstCaretInNode && lastCaretInNode) {
                        node.value = node.value.slice(0, firstPosition) + node.value.slice(lastPosition);

                    } else if (firstCaretInNode && !lastCaretInNode) {
                        node.value = node.value.slice(0, firstPosition);

                    } else if (!firstCaretInNode && lastCaretInNode) {
                        node.value = node.value.slice(lastPosition);

                    } else if (!firstCaretInNode && !lastCaretInNode) {
                        block.nodes.splice(x, 1);
                        x--;
                    }
                }

                if (lastCaretInNode) {

                    i = blocks.length;

                    for (let y = firstBlock + 1; y < lastBlock; y++) {
                        blocks.splice(y, 1);
                        lastBlock--;
                    }

                    if (!(firstCaretInNode && lastCaretInNode)) {
                        blocks[firstBlock].nodes = [...blocks[firstBlock].nodes, ...blocks[lastBlock].nodes];
                        blocks.splice(lastBlock, 1);
                    }

                    break;
                }
            };
        };
    };

    const insertText = (index, value) => {
        const { node, position } = getCaretPositionInfo(index);
        node.value = node.value.slice(0, position) + value + node.value.slice(position);
    }

    const getCaretPositionInfo = (index) => {
        let position = 0;

        for (let i = 0; i < blocks.length; i++) {
            if (i > 0) {
                position++;
            }

            const block = blocks[i];
            for (let x = 0; x < block.nodes.length; x++) {
                const node = block.nodes[x];
                position += node.value.length;

                if (position >= index) {
                    position -= node.value.length;
                    position = index - position;

                    return {
                        node,
                        position
                    };
                }
            };
        };
    };

    const deleteContentBackward = () => {
        const { node, position } = getCaretPositionInfo(caretPosition.focus - 1);
        node.value = node.value.slice(0, position) + node.value.slice(position + 1);
    };

    const deleteContentForward = () => {
        const { node, position } = getCaretPositionInfo(caretPosition.focus);
        node.value = node.value.slice(0, position) + node.value.slice(position + 1);
    };

    const parseBlocks = (content = false) => {
        if (!content) {
            content = editorContent;
        }

        blocks = [];

        [...content.children].forEach(child => {
            blocks.push({
                element: child,
                type: child.nodeName,
                nodes: parseNodes(child)
            });
        });
    };

    const parseNodes = (node) => {
        const nodes = [];

        const findNodes = (parent) => {
            parent.childNodes.forEach(child => {
                if (child.nodeType == 3) {
                    const value = child.nodeValue;

                    nodes.push({
                        element: child,
                        value: value
                    });
                } else {
                    findNodes(child);
                }
            })
        };

        findNodes(node);

        return nodes;
    };

    const getEditorContent = (value) => {
        return editorContent.innerHTML;
    };

    const setEditorContent = (value) => {
        editorContent.innerHTML = value;
        parseBlocks();
    };

    const createEditor = () => {
        editor = document.createElement('div');

        editorContent = document.createElement('div');
        editorContent.contentEditable = true;
        editorContent.style.whiteSpace = 'break-spaces';
        editor.append(editorContent);

        element.parentElement.insertBefore(editor, element);

        const container = document.createElement('div');
        container.innerHTML = value;

        parseBlocks(container);
        setEditorContent(buildHtml());
    };

    createEditor();

    editorContent.onkeydown = (e) => {
        getCaretPosition();
    }

    editorContent.oninput = (e) => {
        let isCollapsed = caretPosition.anchor == caretPosition.focus;
        let newCaretPosition = Math.min(caretPosition.anchor, caretPosition.focus);

        if (e.inputType === 'insertText') {
            if (!isCollapsed) {
                deleteSelected();
            }

            insertText(newCaretPosition, e.data);
            newCaretPosition += e.data.length;

        } else if (e.inputType === 'insertParagraph') {


        } else if (e.inputType === 'insertLineBreak') {


        } else if (e.inputType === 'deleteContentBackward') {
            if (isCollapsed) {
                deleteContentBackward();
                newCaretPosition = caretPosition.focus - 1;

            } else {
                deleteSelected();
            }

        } else if (e.inputType === 'deleteContentForward') {
            if (isCollapsed) {
                deleteContentForward();
                newCaretPosition = caretPosition.focus;

            } else {
                deleteSelected();
            }

        } else if (e.inputType === 'insertFromPaste') {


        }

        setEditorContent(buildHtml());
        setCaretPosition(newCaretPosition);
    }
};