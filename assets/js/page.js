function isUrlAbsolute(url) {
  return url.indexOf("://") > 0 || url.indexOf("//") === 0;
}

function prefetch(link) {
  var subpages = ["embed.html", "page.html"];
  subpages.forEach(function (subpage) {
    var prefetchLink = document.createElement("link");
    prefetchLink.href = link.href + "embed.html";
    prefetchLink.rel = "prefetch";
    prefetchLink.as = "fetch";
    document.head.appendChild(prefetchLink);
  });
}

let pages = [window.location.pathname];

let switchDirectionWindowWidth = 900;
let animationLength = 500;

function fetchNote(href, level) {
  level = Number(level) || pages.length;

  const request = new Request(href + "/page.html");
  fetch(request).then(function (response) {
    response.text().then(function (text) {
      let container = document.querySelector("div.grid");
      let children = Array.prototype.slice.call(container.children);

      let fragment = document.createElement("template");

      for (let i = level; i < pages.length; i++) {
        container.removeChild(children[i]);
        destroyPreviews(children[i]);
      }

      pages = pages.slice(0, level);
      fragment.innerHTML = text;
      let element = fragment.content.querySelector(".page");
      pages.push(href);
      container.appendChild(element);
      element.animate([{ opacity: 0 }, { opacity: 1 }], animationLength);
      window.MathJax.typeset();

      setTimeout(
        function (element, level) {
          element.dataset.level = level + 1;
          initializePreviews(element, level + 1);
          element.scrollIntoView();
        }.bind(null, element, level),
        10
      );

      updateLinkStatuses();
    });
  });
}

function updateLinkStatuses() {
  let links = Array.prototype.slice.call(
    document.querySelectorAll("a[data-uuid]")
  );

  links.forEach(function (link) {
    if (pages.indexOf(link.dataset.uuid) !== -1) {
      link.classList.add("linked");
      if (link._tippy) link._tippy.disable();
    } else {
      link.classList.remove("linked");
      if (link._tippy) link._tippy.enable();
    }
  });
}

function destroyPreviews(page) {
  links = Array.prototype.slice.call(page.querySelectorAll("a[data-uuid]"));
  links.forEach(function (link) {
    if (link.hasOwnProperty("_tippy")) {
      link._tippy.destroy();
    }
  });
}

let tippyOptions = {
  allowHTML: true,
  theme: "light",
  interactive: true,
  interactiveBorder: 10,
  delay: 100,
  //touch: 'hold',
  touch: "none",
  maxWidth: "none",
  inlinePositioning: false,
  placement: "right",
};

function createPreview(link, overrideOptions) {
  level = Number(link.dataset.level);
  console.log(link.href);
  tip = tippy(
    link,
    Object.assign(
      {},
      tippyOptions,
      {
        content:
          '<iframe width="400px" height="300px" src="' +
          link.href +
          '/embed.html"></iframe>',
      },
      overrideOptions
    )
  );
}

function initializePreviews(page, level) {
  level = level || pages.length;

  links = Array.prototype.slice.call(page.querySelectorAll("a"));

  links.forEach(function (element) {
    prefetch(element);
    element.dataset.level = level;

    if (element.hostname === window.location.hostname) {
      createPreview(element, {
        placement:
          window.innerWidth > switchDirectionWindowWidth ? "right" : "top",
      });

      element.addEventListener("click", function (e) {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();

          fetchNote(element.href, this.dataset.level);
        }
      });
    }
  });
}

(function () {
  initializePreviews(document.querySelector(".page"));
})();
