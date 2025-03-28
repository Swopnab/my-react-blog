import React from "react";
import { Link } from "react-router-dom";

const navlinks = [
    { title: "Home", path: "/" },
    { title: "Blog", path: "/blog" },
    { title: "Contact", path: "/contact" },
    { title: "Login", path: "/login" }


];

export default function Navigation() {
    return (
        <nav className="site-navigation">
            <span>Sassy's Blog</span>
            <ul>
                { navlinks.map((link, index) => (
                    <li key={index}>
                        <Link to={link.path}>{link.title}</Link>
                    </li>
                ))}

            </ul>
        </nav>

    )
}