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

        blocks.forEach((block) => {
            const newBlock = document.createElement(block.type);

            let blockValue = [];

            block.nodes.forEach((node) => {
                let parentNode;
                let lastNode;

                blockValue.push(node.value);

                node.types.forEach((type) => {
                    newNode = document.createElement(type);
                    if (lastNode) {
                        lastNode.append(newNode);
                    } else {
                        parentNode = newNode;
                    }

                    lastNode = newNode;
                });

                newNode = document.createTextNode(node.value);

                if (lastNode) {
                    lastNode.append(newNode);
                } else {
                    parentNode = newNode;
                }

                if (node.value !== '') {
                    newBlock.append(parentNode);
                }
            });

            if (blockValue.join('') === '') {
                const emptyNode = document.createElement('BR');
                newBlock.append(emptyNode);
                newBlock.className = 'empty-block';
            }

            container.append(newBlock);
        });

        return container.innerHTML;
    };

    const currentTextNode = () => {
        let { anchorNode, focusNode, anchorOffset, focusOffset } = window.getSelection();

        if (anchorNode.nodeType !== 3) {
            anchorNode = [...anchorNode.childNodes].find((node) => node.nodeType === 3);
        }

        if (focusNode.nodeType !== 3) {
            focusNode = [...focusNode.childNodes].find((node) => node.nodeType === 3);
        }

        return { anchorNode, focusNode, anchorOffset, focusOffset };
    };

    const getCaretPosition = () => {
        let { anchorNode, focusNode, anchorOffset, focusOffset } = currentTextNode();

        const find = (parent, positions, nodeValues = []) => {
            for (let i = 0; i < parent.childNodes.length; i++) {
                const child = parent.childNodes[i];

                if (child.nodeType == 3) {
                    const value = child.nodeValue;

                    if (anchorNode === child) {
                        positions.anchor = nodeValues.join('').length + anchorOffset;
                    }

                    if (focusNode === child) {
                        positions.focus = nodeValues.join('').length + focusOffset;
                    }

                    if (positions.anchor && positions.focus) {
                        break;
                    }

                    nodeValues.push(value);
                } else {
                    positions = find(child, positions, nodeValues);

                    // Add extra whitespace if current element is a block element
                    if (window.getComputedStyle(child, null).getPropertyValue('display') === 'block') {
                        nodeValues.push(' ');
                    }
                }
            }

            return positions;
        };

        caretPosition = find(editorContent, { anchor: null, focus: null });

        return caretPosition;
    };

    const setCaretPosition = (focusIndex = null, anchorIndex = null) => {
        // Fill empty arguments
        if (focusIndex !== null && anchorIndex === null) {
            anchorIndex = focusIndex;
        } else if (focusIndex === null) {
            focusIndex = caretPosition.focus;
            anchorIndex = caretPosition.anchor;
        }

        const find = (parent, positions, nodeValues = []) => {
            for (let i = 0; i < parent.childNodes.length; i++) {
                const child = parent.childNodes[i];

                if (child.nodeType == 3) {
                    const value = child.nodeValue;
                    const nextNodeValueLength = [...nodeValues, value].join('').length;

                    if (!positions.focus && focusIndex <= nextNodeValueLength) {
                        positions.focus = {
                            node: child,
                            offset: focusIndex - nodeValues.join('').length
                        };
                    }

                    if (!positions.anchor && anchorIndex <= nextNodeValueLength) {
                        positions.anchor = {
                            node: child,
                            offset: anchorIndex - nodeValues.join('').length
                        };
                    }

                    if (positions.anchor && positions.focus) {
                        break;
                    }

                    nodeValues.push(value);
                } else {
                    positions = find(child, positions, nodeValues);

                    // Add extra whitespace if current element is a block element
                    if (window.getComputedStyle(child, null).getPropertyValue('display') === 'block') {
                        nodeValues.push(' ');
                    }
                }
            }

            return positions;
        };

        const positions = find(editorContent, { anchor: null, focus: null });

        const range = document.createRange();
        const selection = window.getSelection();

        range.setEnd(positions.focus.node, positions.focus.offset);
        range.setStart(positions.anchor.node, positions.anchor.offset);

        selection.removeAllRanges();
        selection.addRange(range);
    };

    const deleteSelected = () => {
        const firstCaret = Math.min(caretPosition.anchor, caretPosition.focus);
        const lastCaret = Math.max(caretPosition.anchor, caretPosition.focus);

        const firstCaretInfo = getCaretPositionInfo(firstCaret);
        const lastCaretInfo = getCaretPositionInfo(lastCaret);

        if (firstCaretInfo.node === lastCaretInfo.node) {
            firstCaretInfo.node.value = firstCaretInfo.node.value.substring(0, firstCaretInfo.position) + firstCaretInfo.node.value.substring(lastCaretInfo.position);
        } else {
            firstCaretInfo.node.value = firstCaretInfo.node.value.substring(0, firstCaretInfo.position);
            lastCaretInfo.node.value = lastCaretInfo.node.value.substring(lastCaretInfo.position);
        }

        if (lastCaretInfo.blockIndex - firstCaretInfo.blockIndex > 1) {
            blocks.splice(firstCaretInfo.blockIndex + 1, lastCaretInfo.blockIndex - (firstCaretInfo.blockIndex + 1));
        }

        if (firstCaretInfo.block === lastCaretInfo.block) {
            firstCaretInfo.block.nodes.splice(firstCaretInfo.nodeIndex + 1, lastCaretInfo.nodeIndex - (firstCaretInfo.nodeIndex + 1));
        } else {
            firstCaretInfo.block.nodes.splice(firstCaretInfo.nodeIndex + 1);
            lastCaretInfo.block.nodes.splice(0, lastCaretInfo.nodeIndex);
        }

        if (firstCaretInfo.blockIndex !== lastCaretInfo.blockIndex) {
            let toBeMergedBlock = blocks.splice(firstCaretInfo.blockIndex + 1, 1);
            firstCaretInfo.block.nodes = [...firstCaretInfo.block.nodes, ...toBeMergedBlock[0].nodes];
        }
    };

    const insertText = (index, value) => {
        const { node, position } = getCaretPositionInfo(index);
        node.value = node.value.slice(0, position) + value + node.value.slice(position);
    };

    const getCaretPositionInfo = (index) => {
        let position = 0;

        for (let i = 0; i < blocks.length; i++) {
            let block = blocks[i];

            for (let x = 0; x < block.nodes.length; x++) {
                const node = block.nodes[x];
                const nodeLength = node.value.length;
                position += nodeLength;

                if (position >= index) {
                    position -= nodeLength;
                    position = index - position;

                    return {
                        position,
                        block,
                        blockIndex: i,
                        node,
                        nodeIndex: x
                    };
                }
            }

            position++;
        }
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

        [...content.children].forEach((child) => {
            blocks.push({
                type: child.nodeName,
                nodes: parseNodes(child)
            });
        });

        for (let i = 0; i < blocks.length; i++) {
            for (let x = 0; x < blocks[i].nodes.length - 1; x++) {
                if (equalArrays(blocks[i].nodes[x].types, blocks[i].nodes[x + 1].types)) {
                    blocks[i].nodes[x].value += blocks[i].nodes[x + 1].value;
                    blocks[i].nodes.splice(x + 1, 1);
                    x--;
                }
            }
        }
    };

    const equalArrays = (first = [], second = []) => first.sort().toString() === second.sort().toString();

    const parseNodes = (node) => {
        const nodes = [];

        const findNodes = (parent, types = []) => {
            parent.childNodes.forEach((child) => {
                if (child.nodeType == 3) {
                    const value = child.nodeValue;

                    if (nodes[nodes.length - 1] && equalArrays(types, nodes[nodes.length - 1].types)) {
                        nodes[nodes.length - 1].value += value;
                    } else {
                        nodes.push({
                            //element: child,
                            types: types,
                            value: value
                        });
                    }
                } else {
                    findNodes(child, [...types, child.nodeName]);
                }
            });
        };

        findNodes(node);

        if (nodes.length === 0) {
            const textNode = document.createTextNode('');
            node.append(textNode);

            nodes.push({
                //element: textNode,
                types: [],
                value: ''
            });
        }

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
    };

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
            if (!isCollapsed) {
                deleteSelected();
            }

            let { position, node, nodeIndex, block, blockIndex } = getCaretPositionInfo(newCaretPosition);

            let firstNode = { ...node };
            let lastNode = { ...node };

            let firstBlockNodes = block.nodes.filter((blockNode, index) => index < nodeIndex);
            let lastBlockNodes = block.nodes.filter((blockNode, index) => nodeIndex < index);

            firstNode.value = firstNode.value.slice(0, position);
            lastNode.value = lastNode.value.slice(position);

            firstBlockNodes.push(firstNode);
            lastBlockNodes.unshift(lastNode);

            let firstBlock = { ...block, nodes: firstBlockNodes };
            let lastBlock = { ...block, nodes: lastBlockNodes };

            blocks.splice(blockIndex, 1, lastBlock);
            blocks.splice(blockIndex, 0, firstBlock);

            newCaretPosition = newCaretPosition + 1;
        } else if (e.inputType === 'insertLineBreak') {
        } else if (e.inputType === 'deleteContentBackward') {
            if (isCollapsed) {
                let { block: firstCaretInNode } = getCaretPositionInfo(caretPosition.focus - 1);
                let { block: lastCaretInNode } = getCaretPositionInfo(caretPosition.focus);

                deleteContentBackward();
                newCaretPosition = caretPosition.focus - 1;

                if (firstCaretInNode != lastCaretInNode) {
                    firstCaretInNode.nodes = [...firstCaretInNode.nodes, ...lastCaretInNode.nodes];
                    blocks = blocks.filter((block) => block != lastCaretInNode);
                }
            } else {
                deleteSelected();
            }
        } else if (e.inputType === 'deleteContentForward') {
            if (isCollapsed) {
                let { block: firstCaretInNode } = getCaretPositionInfo(caretPosition.focus);
                let { block: lastCaretInNode } = getCaretPositionInfo(caretPosition.focus + 1);

                deleteContentForward();
                newCaretPosition = caretPosition.focus;

                if (firstCaretInNode != lastCaretInNode) {
                    firstCaretInNode.nodes = [...firstCaretInNode.nodes, ...lastCaretInNode.nodes];
                    blocks = blocks.filter((block) => block != lastCaretInNode);
                }
            } else {
                deleteSelected();
            }
        } else if (e.inputType === 'insertReplacementText') {
        } else if (e.inputType === 'insertOrderedList') {
        } else if (e.inputType === 'insertUnorderedList') {
        } else if (e.inputType === 'insertHorizontalRule') {
        } else if (e.inputType === 'insertFromYank') {
        } else if (e.inputType === 'insertFromDrop') {
        } else if (e.inputType === 'insertFromPaste') {
        } else if (e.inputType === 'insertTranspose') {
        } else if (e.inputType === 'insertCompositionText') {
        } else if (e.inputType === 'insertFromComposition') {
        } else if (e.inputType === 'insertLink') {
        } else if (e.inputType === 'deleteByComposition') {
        } else if (e.inputType === 'deleteCompositionText') {
        } else if (e.inputType === 'deleteWordBackward') {
        } else if (e.inputType === 'deleteWordForward') {
        } else if (e.inputType === 'deleteSoftLineBackward') {
        } else if (e.inputType === 'deleteSoftLineForward') {
        } else if (e.inputType === 'deleteEntireSoftLine') {
        } else if (e.inputType === 'deleteHardLineBackward') {
        } else if (e.inputType === 'deleteHardLineForward') {
        } else if (e.inputType === 'deleteByDrag') {
        } else if (e.inputType === 'deleteByCut') {
        } else if (e.inputType === 'deleteByContent') {
        } else if (e.inputType === 'historyUndo') {
        } else if (e.inputType === 'historyRedo') {
        } else if (e.inputType === 'formatBold') {
        } else if (e.inputType === 'formatItalic') {
        } else if (e.inputType === 'formatUnderline') {
        } else if (e.inputType === 'formatStrikethrough') {
        } else if (e.inputType === 'formatSuperscript') {
        } else if (e.inputType === 'formatSubscript') {
        } else if (e.inputType === 'formatJustifyFull') {
        } else if (e.inputType === 'formatJustifyCenter') {
        } else if (e.inputType === 'formatJustifyRight') {
        } else if (e.inputType === 'formatJustifyLeft') {
        } else if (e.inputType === 'formatIndent') {
        } else if (e.inputType === 'formatOutdent') {
        } else if (e.inputType === 'formatRemove') {
        } else if (e.inputType === 'formatSetBlockTextDirection') {
        } else if (e.inputType === 'formatSetInlineTextDirection') {
        } else if (e.inputType === 'formatBackColor') {
        } else if (e.inputType === 'formatFontColor') {
        } else if (e.inputType === 'formatFontName') {
        }

        setEditorContent(buildHtml());
        setCaretPosition(newCaretPosition);
    };
};
