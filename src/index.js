window.RichTextEditor = (element) => {
    let value = element.value;

    let caretPosition = {
        anchor: null,
        focus: null
    };

    let activeData;

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

    const getCaretPosition = (setGlobal = true) => {
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

        const currentCaretPosition = find(editorContent, { anchor: null, focus: null });

        if(setGlobal) {
            caretPosition = currentCaretPosition;
        }

        return currentCaretPosition;
    };

    const setCaretPosition = (focusIndex = null, anchorIndex = null) => {
        // Fill empty arguments
        if (focusIndex !== null && anchorIndex === null) {
            anchorIndex = focusIndex;
        } else if (focusIndex === null) {
            focusIndex = caretPosition.focus;
            anchorIndex = caretPosition.anchor;
        }

        const firstIndex = Math.min(focusIndex, anchorIndex);
        const lastIndex = Math.max(focusIndex, anchorIndex);

        const find = (parent, positions, nodeValues = []) => {
            for (let i = 0; i < parent.childNodes.length; i++) {
                const child = parent.childNodes[i];

                if (child.nodeType == 3) {
                    const value = child.nodeValue;
                    const nextNodeValueLength = [...nodeValues, value].join('').length;

                    if (!positions.focus && lastIndex <= nextNodeValueLength) {
                        positions.focus = {
                            node: child,
                            offset: lastIndex - nodeValues.join('').length
                        };
                    }

                    if (!positions.anchor && firstIndex <= nextNodeValueLength) {
                        positions.anchor = {
                            node: child,
                            offset: firstIndex - nodeValues.join('').length
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
                types: [],
                value: ''
            });
        }

        return nodes;
    };

    const splitNode = (caretPosition) => {
        const { block, node, nodeIndex, position } = getCaretPositionInfo(caretPosition);

        const newNode = { ...node, value: node.value.substring(0, position) };
        block.nodes.splice(nodeIndex, 0, newNode);
        node.value = node.value.substring(position);
    };

    const extractNode = (startPosition, endPosition) => {
        const start = Math.min(startPosition, endPosition);
        const end = Math.max(startPosition, endPosition);

        splitNode(start);
        splitNode(end);

        const nodes = [];

        let position = 0;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            for (let x = 0; x < block.nodes.length; x++) {
                const node = block.nodes[x];

                if (start <= position) {
                    if (node.value !== '') {
                        nodes.push(node);
                    }
                }

                if (end <= position + node.value.length) {
                    return nodes;
                }

                position += node.value.length;
            }

            position++;
        }

        nodes;

        return nodes;
    };

    const setInlineStyle = (tag, focus, anchor) => {
        const nodes = extractNode(focus, anchor);

        const removeTag = nodes.every((node) => {
            return node.types.includes(tag);
        });

        if (removeTag) {
            nodes.map((node) => {
                node.types = node.types.filter((type) => type !== tag);
            });
        } else {
            nodes.map((node) => {
                node.types = [...new Set([...node.types, tag])];
            });
        }

        setEditorContent(buildHtml());
        setCaretPosition(focus, anchor);
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

    editorContent.onpaste = (e) => {
        clipboardData = e.clipboardData || window.clipboardData;
        activeData = clipboardData.getData('Text').replace(/(\r\n|\n|\r)/gm, ' ');
    };

    editorContent.onkeydown = (e) => {
        getCaretPosition();
    };

    editorContent.oninput = (e) => {
        let isCollapsed = caretPosition.anchor == caretPosition.focus;
        let newCaretPositionFocus = Math.min(caretPosition.anchor, caretPosition.focus);
        let newCaretPositionAnchor = Math.max(caretPosition.anchor, caretPosition.focus);

        if (e.inputType === 'insertText') {
            if (!isCollapsed) {
                deleteSelected();
            }

            insertText(newCaretPositionFocus, e.data);
            newCaretPositionFocus += e.data.length;

            setEditorContent(buildHtml());
            setCaretPosition(newCaretPositionFocus);
        } else if (e.inputType === 'insertParagraph') {
            if (!isCollapsed) {
                deleteSelected();
            }

            let { position, node, nodeIndex, block, blockIndex } = getCaretPositionInfo(newCaretPositionFocus);

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

            newCaretPositionFocus = newCaretPositionFocus + 1;

            setEditorContent(buildHtml());
            setCaretPosition(newCaretPositionFocus);
        } else if (e.inputType === 'insertLineBreak') {
        } else if (['deleteContentBackward', 'deleteWordBackward', 'deleteHardLineBackward', 'deleteSoftLineBackward'].includes(e.inputType)) {
            if (isCollapsed) {
                let { block: firstCaretInNode } = getCaretPositionInfo(caretPosition.focus - 1);
                let { block: lastCaretInNode } = getCaretPositionInfo(caretPosition.focus);

                deleteContentBackward();
                newCaretPositionFocus = caretPosition.focus - 1;

                if (firstCaretInNode != lastCaretInNode) {
                    firstCaretInNode.nodes = [...firstCaretInNode.nodes, ...lastCaretInNode.nodes];
                    blocks = blocks.filter((block) => block != lastCaretInNode);
                }
            } else {
                deleteSelected();
            }

            setEditorContent(buildHtml());
            setCaretPosition(newCaretPositionFocus);
        } else if (['deleteContentForward', 'deleteWordForward', 'deleteHardLineForward', 'deleteSoftLineForward'].includes(e.inputType)) {
            if (isCollapsed) {
                let { block: firstCaretInNode } = getCaretPositionInfo(caretPosition.focus);
                let { block: lastCaretInNode } = getCaretPositionInfo(caretPosition.focus + 1);

                deleteContentForward();
                newCaretPositionFocus = caretPosition.focus;

                if (firstCaretInNode != lastCaretInNode) {
                    firstCaretInNode.nodes = [...firstCaretInNode.nodes, ...lastCaretInNode.nodes];
                    blocks = blocks.filter((block) => block != lastCaretInNode);
                }
            } else {
                deleteSelected();
            }

            setEditorContent(buildHtml());
            setCaretPosition(newCaretPositionFocus);
        } else if (e.inputType === 'insertFromPaste') {
            if (!isCollapsed) {
                deleteSelected();
            }
            insertText(newCaretPositionFocus, activeData);
            newCaretPositionFocus += activeData.length;

            setEditorContent(buildHtml());
            setCaretPosition(newCaretPositionFocus);
        } else if (e.inputType === 'deleteByCut') {
            deleteSelected();
            setEditorContent(buildHtml());
            setCaretPosition(newCaretPositionFocus);
        } else if (e.inputType === 'historyUndo') {
            // Not implemented
        } else if (e.inputType === 'historyRedo') {
            // Not implemented
        } else if (e.inputType === 'formatBold') {
            setInlineStyle('B', caretPosition.focus, caretPosition.anchor);
        } else if (e.inputType === 'formatItalic') {
            setInlineStyle('I', caretPosition.focus, caretPosition.anchor);
        } else if (e.inputType === 'formatUnderline') {
            setInlineStyle('U', caretPosition.focus, caretPosition.anchor);
        } else if (e.inputType === 'formatStrikethrough') {
            setInlineStyle('S', caretPosition.focus, caretPosition.anchor);
        } else if (e.inputType === 'formatSuperscript') {
            setInlineStyle('SUP', caretPosition.focus, caretPosition.anchor);
        } else if (e.inputType === 'formatSubscript') {
            setInlineStyle('SUB', caretPosition.focus, caretPosition.anchor);
        } else {
            // Everything else that is not implemented
            setEditorContent(buildHtml());
            setCaretPosition(newCaretPositionFocus);
        }

        activeData = null;
    };
};
