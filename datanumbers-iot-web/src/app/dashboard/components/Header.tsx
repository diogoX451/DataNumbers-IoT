"use-client";

import Link from "next/link";
import { Form, Nav, Navbar } from "react-bootstrap";
import { Menu } from "react-feather";
import MenuUser from "../layouts/MenuUser";

const Header = (props) => {
  return (
    <>
      <Navbar expanded="lg" className="navbar-classic navbar navbar-expand-lg">
        <div className="d-flex justify-content-between w-100">
          <div className="d-flex align-items-center">
            <Link
              href="#"
              id="nav-toggle"
              className="nav-icon me-2 icon-xs"
              onClick={() => props.data.SidebarToggleMenu(!props.data.showMenu)}
            >
              <Menu size="18px" />
            </Link>
          </div>
          <Nav className="navbar-right-wrap ms-2 d-flex nav-top-wrap">
            <MenuUser />
          </Nav>
        </div>
      </Navbar>
    </>
  );
};

export default Header;
