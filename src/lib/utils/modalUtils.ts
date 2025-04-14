let scrollPosition = 0;

export const lockBodyScroll = () => {
	scrollPosition = window.scrollY;
	document.body.style.overflow = 'hidden';
	document.body.style.position = 'fixed';
	document.body.style.width = '100%';
	document.body.style.height = '100%';
};

export const unlockBodyScroll = () => {
	document.body.style.overflow = 'auto';
	document.body.style.position = '';
	document.body.style.width = '';
	document.body.style.height = '';
	requestAnimationFrame(() => {
		window.scrollTo(0, scrollPosition);
	});
};
