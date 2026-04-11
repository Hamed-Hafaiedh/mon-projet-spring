document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.nav-toggle-btn[data-target]');

    const setToggleIcon = (button, expanded) => {
        const icon = button.querySelector('span[aria-hidden="true"]');
        if (icon) {
            icon.textContent = expanded ? '✕' : '☰';
        }
    };

    toggleButtons.forEach((button) => {
        const targetId = button.getAttribute('data-target');
        if (!targetId) return;

        const panel = document.getElementById(targetId);
        if (!panel) return;

        const setExpanded = (expanded) => {
            button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            panel.classList.toggle('is-open', expanded);
            setToggleIcon(button, expanded);
        };

        setExpanded(false);

        button.addEventListener('click', () => {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            setExpanded(!isExpanded);
        });

        panel.querySelectorAll('a, button').forEach((item) => {
            if (item === button) return;
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    setExpanded(false);
                }
            });
        });

        document.addEventListener('click', (event) => {
            if (window.innerWidth > 768) return;
            const clickedInsideMenu = panel.contains(event.target);
            const clickedToggle = button.contains(event.target);
            if (!clickedInsideMenu && !clickedToggle) {
                setExpanded(false);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                setExpanded(false);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                setExpanded(false);
            }
        });
    });
});

