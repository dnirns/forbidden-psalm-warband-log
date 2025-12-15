import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Page from './+page.svelte';
import type { Character, WarbandData } from '$lib/types';

const stubComponent = vi.hoisted(() => {
	return (name: string) => {
		function Stub(this: any, options?: { target?: HTMLElement }) {
			if (!(this instanceof Stub)) {
				return new (Stub as any)(options);
			}
			const el = document.createElement('div');
			el.dataset.testid = name;
			options?.target?.appendChild(el);
		}
		Stub.prototype.$destroy = () => {};
		Stub.prototype.$on = () => () => {};
		Stub.prototype.$set = () => {};
		return Stub as any;
	};
});

const authMocks = vi.hoisted(() => {
	const state: { callback?: (user: any) => Promise<void> | void } = {};
	const service = {
		onChange: vi.fn((callback: (user: any) => Promise<void> | void) => {
			state.callback = callback;
			return authMocks.unsubscribe;
		}),
		signInWithGoogle: vi.fn(),
		signOut: vi.fn()
	};

	return {
		state,
		service,
		unsubscribe: vi.fn(),
		triggerAuthChange: async (user: any) => {
			await state.callback?.(user);
		}
	};
});

const warbandMocks = vi.hoisted(() => {
	const baseCharacter: Character = {
		name: 'Hero',
		hp: 10,
		armour: 0,
		agility: 0,
		presence: 0,
		strength: 0,
		toughness: 0,
		inventory: 2,
		items: ['', ''],
		pickedUpItems: [],
		feats: [],
		flaws: [],
		injuries: [],
		isSpellcaster: false,
		cleanScroll: '',
		uncleanScroll: '',
		ammoTrackers: []
	};
	const initialState = {
		data: {
			warbandName: 'Test Warband',
			characters: [baseCharacter],
			gold: 50,
			xp: 0,
			notes: ''
		} as WarbandData,
		selectedIndex: -1,
		currentCharacter: baseCharacter,
		isSaving: false,
		showModal: false,
		originalCharacterGold: 0
	};

	const subscribers = new Set<(state: typeof initialState) => void>();
	let currentState = initialState;

	const subscribe = (fn: (state: typeof initialState) => void) => {
		subscribers.add(fn);
		fn(currentState);
		return () => subscribers.delete(fn);
	};

	const setState = (state: typeof initialState) => {
		currentState = state;
		subscribers.forEach((fn) => fn(currentState));
	};

	const reset = vi.fn(() => setState(initialState));
	const load = vi.fn();
	const listenToRemote = vi.fn();
	const addCharacter = vi.fn();
	const editCharacter = vi.fn();
	const deleteCharacter = vi.fn();

	return {
		store: { subscribe },
		initialState,
		reset,
		load,
		listenToRemote,
		addCharacter,
		editCharacter,
		deleteCharacter,
		setState
	};
});

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$domain/application', () => ({
	createAuthApplicationService: () => authMocks.service,
	createWarbandApplicationService: () => ({
		save: vi.fn(),
		load: vi.fn(),
		subscribe: vi.fn()
	})
}));
vi.mock('$lib/stores/warbandStore', () => ({
	warbandStore: {
		subscribe: warbandMocks.store.subscribe,
		reset: (...args: unknown[]) => warbandMocks.reset(...args),
		load: (...args: unknown[]) => warbandMocks.load(...args),
		listenToRemote: (...args: unknown[]) => warbandMocks.listenToRemote(...args),
		addCharacter: (...args: unknown[]) => warbandMocks.addCharacter(...args),
		editCharacter: (...args: unknown[]) => warbandMocks.editCharacter(...args),
		deleteCharacter: (...args: unknown[]) => warbandMocks.deleteCharacter(...args)
	}
}));
vi.mock('../components/modals/CharacterModal.svelte', () => ({
	default: stubComponent('character-modal')
}));
vi.mock('../components/misc/GDPR.svelte', () => ({
	default: stubComponent('gdpr')
}));

describe('Home page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		warbandMocks.reset();
	});

	it('shows loading indicator before auth resolves', () => {
		render(Page);
		expect(screen.getByText('Loading...')).toBeInTheDocument();
		expect(authMocks.service.onChange).toHaveBeenCalledTimes(1);
	});

	it('renders sign-in view when user is null', async () => {
		render(Page);

		await authMocks.triggerAuthChange(null);

		await waitFor(() => {
			expect(screen.getByText('Welcome to Forbidden Psalm Warband Builder')).toBeInTheDocument();
		});
		expect(warbandMocks.reset).toHaveBeenCalledTimes(2);
		expect(warbandMocks.listenToRemote).not.toHaveBeenCalled();
	});

	it('signs in with Google and loads warband data', async () => {
		render(Page);
		await authMocks.triggerAuthChange(null);

		authMocks.service.signInWithGoogle.mockResolvedValueOnce({ uid: 'user-123' });
		warbandMocks.load.mockImplementationOnce(async () => {
			warbandMocks.setState({
				...warbandMocks.initialState,
				data: { ...warbandMocks.initialState.data, warbandName: 'Signed In Band' }
			});
		});

		await fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

		await waitFor(() => expect(authMocks.service.signInWithGoogle).toHaveBeenCalledTimes(1));
		expect(warbandMocks.load).toHaveBeenCalledWith('user-123');
		await waitFor(() => expect(screen.getByText('Signed In Band')).toBeInTheDocument());
	});

	it('subscribes to remote data when a user is available', async () => {
		warbandMocks.listenToRemote.mockResolvedValueOnce(vi.fn());
		render(Page);

		await authMocks.triggerAuthChange({ uid: 'user-999' });

		await waitFor(() => expect(warbandMocks.listenToRemote).toHaveBeenCalledWith('user-999'));
		expect(warbandMocks.load).toHaveBeenCalledWith('user-999');
		expect(warbandMocks.reset).toHaveBeenCalledTimes(1);
	});

	it('signs out via header action', async () => {
		warbandMocks.listenToRemote.mockResolvedValueOnce(vi.fn());
		render(Page);
		await authMocks.triggerAuthChange({ uid: 'user-888' });

		warbandMocks.reset.mockClear();
		authMocks.service.signOut.mockResolvedValueOnce(undefined);

		await fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

		await waitFor(() => expect(authMocks.service.signOut).toHaveBeenCalledTimes(1));
		expect(warbandMocks.reset).toHaveBeenCalledTimes(1);
	});
});
