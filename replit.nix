{pkgs}: {
  deps = [
    pkgs.xorg.libxkbfile
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.dbus
    pkgs.expat
    pkgs.cairo
    pkgs.pango
    pkgs.mesa
    pkgs.libxkbcommon
    pkgs.libdrm
    pkgs.alsa-lib
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
