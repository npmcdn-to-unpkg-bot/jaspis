import set from '../datasets/arranged_1.json';

import { PackingAlgorithm } from '../../src/packing-algorithm';
import { findElementThatFits } from '../../src/packager';

var elems = set.elements;

describe('packing elements', () => {
    describe('selecting next element', () => {
        it('takes element with smallest index that has smaller width than place', () => {
            const elements = [
                { columnSpan: 4, rowSpan: 1, index: 0 },
                { columnSpan: 2, rowSpan: 3, index: 1 },
                { columnSpan: 4, rowSpan: 2, index: 2 },
                { columnSpan: 1, rowSpan: 3, index: 3 },
            ];
            const place = { columnSpan: 2, rowSpan: 5 };

            const element = findElementThatFits(elements, place);

            expect(element).toEqual({ element: elements[1], index: 1 });

        });

        it('returns null when there is no element with smaller width than place', () => {
            const elements = [
                { columnSpan: 4, rowSpan: 1, index: 0 },
                { columnSpan: 20, rowSpan: 3, index: 1 },
                { columnSpan: 4, rowSpan: 2, index: 2 },
                { columnSpan: 12, rowSpan: 3, index: 3 },
            ];
            const place = { columnSpan: 2, rowSpan: 5 };

            const element = findElementThatFits(elements, place);

            expect(element).toEqual({ element: null });
        });
    });


    it('packs one element set in left upper corner', () => {
        const packer = new PackingAlgorithm({
            columnWidth: 100,
            elements: [{ width: 200, height: 200, index: 0 }],
            getWidth: () => 1000,
        });
        const elems = packer.pack();

        expect(elems[0].left).toBe(0);
        expect(elems[0].top).toBe(0);
    });

    it('stacks elements next to previous if there is available space', () => {
        const elements = [
            { width: 100, height: 100, index: 0 },
            { width: 400, height: 100, index: 1 },
            { width: 200, height: 100, index: 2 },
        ];

        const packer = new PackingAlgorithm({
            columnWidth: 100,
            elements: elements,
            getWidth: () => 1000,
        });
        const packedElements = packer.pack();

        expect(packedElements[0].left).toBe(0);
        expect(packedElements[1].left).toBe(100);
        expect(packedElements[2].left).toBe(100 + 400);

        packedElements.forEach(element => expect(element.top).toBe(0));
    });

    it('stacks first elements in row and places next element in the niche closest to top', () => {
        const elements = [
            { width: 100, height: 300, index: 0 },
            { width: 400, height: 100, index: 1 },
            { width: 400, height: 200, index: 2 },
            { width: 200, height: 300, index: 3 },
        ];

        const packer = new PackingAlgorithm({
            columnWidth: 100,
            rowHeight: 100,
            elements: elements,
            getWidth: () => 1000,
        });
        const packedElements = packer.pack();

        expect(packedElements[0].left).toBe(0);
        expect(packedElements[1].left).toBe(100);
        expect(packedElements[2].left).toBe(100 + 400);
        expect(packedElements[3].left).toBe(100);

        packedElements.forEach(element => expect(element.top).toBe(element.index === 3 ? 100 : 0));
    });

    it('packs arranged_1', () => {
        const elements = set.elementsHistory[0];

        const packer = new PackingAlgorithm({
            columnWidth: set.columnWidth,
            rowHeight: set.rowHeight,
            getWidth: () => 600,
            elements: elements,
        });

        const packedElements = packer.pack();

        expect(packedElements[0].left).toBe(0);
        expect(packedElements[0].top).toBe(0);

        expect(packedElements[1].left).toBe(200);
        expect(packedElements[1].top).toBe(0);

        expect(packedElements[2].left).toBe(300);
        expect(packedElements[2].top).toBe(0);

        expect(packedElements[3].left).toBe(0);
        expect(packedElements[3].top).toBe(200);

        expect(packedElements[4].left).toBe(500);
        expect(packedElements[4].top).toBe(0);

        expect(packedElements[5].left).toBe(200);
        expect(packedElements[5].top).toBe(100);
    });
});