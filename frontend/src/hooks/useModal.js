import { useState, useCallback } from 'react';

const useModal = () => {
	const [modalState, setModalState] = useState({
		isOpen: false,
		title: '',
		message: '',
		type: 'info',
		onConfirm: null,
		confirmText: 'OK',
		cancelText: 'Cancel',
		showCancelButton: false
	});

	const showModal = useCallback(({
		title,
		message,
		type = 'info',
		onConfirm = null,
		confirmText = 'OK',
		cancelText = 'Cancel',
		showCancelButton = false
	}) => {
		setModalState({
			isOpen: true,
			title,
			message,
			type,
			onConfirm,
			confirmText,
			cancelText,
			showCancelButton
		});
	}, []);

	const hideModal = useCallback(() => {
		setModalState(prev => ({ ...prev, isOpen: false }));
	}, []);

	// Convenience methods
	const showSuccess = useCallback((title, message, onConfirm = null) => {
		showModal({ title, message, type: 'success', onConfirm });
	}, [showModal]);

	const showError = useCallback((title, message, onConfirm = null) => {
		showModal({ title, message, type: 'error', onConfirm });
	}, [showModal]);

	const showWarning = useCallback((title, message, onConfirm = null) => {
		showModal({ title, message, type: 'warning', onConfirm });
	}, [showModal]);

	const showInfo = useCallback((title, message, onConfirm = null) => {
		showModal({ title, message, type: 'info', onConfirm });
	}, [showModal]);

	const showConfirm = useCallback((title, message, onConfirm, _onCancel = null) => {
		showModal({
			title,
			message,
			type: 'warning',
			onConfirm,
			confirmText: 'Confirm',
			cancelText: 'Cancel',
			showCancelButton: true
		});
	}, [showModal]);

	return {
		modalState,
		showModal,
		hideModal,
		showSuccess,
		showError,
		showWarning,
		showInfo,
		showConfirm
	};
};

export default useModal;
