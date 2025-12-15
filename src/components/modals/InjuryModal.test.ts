import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import InjuryModal from './InjuryModal.svelte';

const modalMocks = vi.hoisted(() => ({
	lockBodyScroll: vi.fn(),
	unlockBodyScroll: vi.fn()
}));

vi.mock('$lib/data/injuries', () => ({
	injuries: [
		{ name: 'Broken Arm', description: 'Hurts' },
		{ name: 'Scar', description: 'Looks rough' }
	]
}));

vi.mock('$lib/utils/modalUtils', () => ({
	lockBodyScroll: (...args: unknown[]) => modalMocks.lockBodyScroll(...args),
	unlockBodyScroll: (...args: unknown[]) => modalMocks.unlockBodyScroll(...args)
}));

describe('InjuryModal', () => {
	beforeEach(() => {
		modalMocks.lockBodyScroll.mockClear();
		modalMocks.unlockBodyScroll.mockClear();
	});

	it('selects an injury and adds it', async () => {
		const onAddInjury = vi.fn();
		const onClose = vi.fn();

		render(InjuryModal, { onAddInjury, onClose });

		expect(modalMocks.lockBodyScroll).toHaveBeenCalled();
		expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

		await fireEvent.change(screen.getByLabelText('Select Injury:'), {
			target: { value: 'Broken Arm' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Add' }));

		expect(onAddInjury).toHaveBeenCalledWith('Broken Arm');
		expect(onClose).toHaveBeenCalled();
	});

	it('closes on escape key', async () => {
		const onClose = vi.fn();
		render(InjuryModal, { onAddInjury: vi.fn(), onClose });

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onClose).toHaveBeenCalled();
	});
});
