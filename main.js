/**
 * Toggles the visibility of the navbar by adding or removing the 'show' class
 */
function toggleNavbar() {
    const navbar = document.getElementById('navbar-items');
    if (navbar.classList.contains('show')) {
        navbar.classList.remove('show');
    } else {
        navbar.classList.add('show');
    }
}