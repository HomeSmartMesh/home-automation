//https://gist.github.com/DavidMStraub/73bb87e41ca8da9ad3deebf06571989a
class MvgCard extends HTMLElement {
    set hass(hass) {
  
      const entityId = this.config.entity;
      const state = hass.states[entityId];
      const name = state.attributes['friendly_name']
  
      if (!this.content) {
        const card = document.createElement('ha-card');
        card.header = name;
        this.content = document.createElement('div');
        const style = document.createElement('style');
        style.textContent = `
          table {
            width: 100%;
            padding: 6px 14px;
          }
          td {
            padding: 3px 0px;
          }
          td.shrink {
            white-space:nowrap;
          }
          td.expand {
            width: 99%
          }
          span.line {
            font-weight: bold;
            font-size:0.9em;
            padding:3px 8px 2px 8px;
            color: #fff;
            background-color: #888;
            margin-right:0.7em;
          }
          span.S-Bahn {
            border-radius:999px;
          }
          span.U-Bahn {
          }
          span.Tram {
            background-color: #ee1c25;
          }
          span.Bus {
            background-color: #005f5f;
          }
          span.U1 {
            background-color: #3c7233;
          }
          span.U2 {
            background-color: #c4022e;
          }
          span.U3 {
            background-color: #ed6720;
          }
          span.U4 {
            background-color: #00ab85;
          }
          span.U5 {
            background-color: #be7b00;
          }
          span.U6 {
            background-color: #0065af;
          }
          span.U7 {
            background-color: #c4022e;
          }
          span.U8 {
            background-color: #ed6720;
          }
          span.S1 {
            background-color: #16c0e9;
          }
          span.S2 {
            background-color: #71bf44;
          }
          span.S3 {
            background-color: #7b107d;
          }
          span.S4 {
            background-color: #ee1c25;
          }
          span.S5 {
            background-color: #ffcc00;
            color: black;
          }
          span.S6 {
            background-color: #008a51;
          }
          span.S7 {
            background-color: #963833;
          }
          span.S8 {
            background-color: black;
            color: #ffcb06;
          }
          span.S20 {
            background-color: #f05a73;
          }
          `
        card.appendChild(style);
        card.appendChild(this.content);
        this.appendChild(card);
      }
  
      var tablehtml = `
      <table>
      `
      for (const attributes of state.attributes['departures']) {
        const icon = attributes['icon']
        const destination = attributes['destination']
        const linename = attributes['linename']
        const product = attributes['product']
        const time = attributes['time']
  
        const iconel = document.createElement('ha-icon');
        iconel.setAttribute('icon', icon);
        const iconHTML = iconel.outerHTML;
  
        tablehtml += `
            <tr>
              <td class="shrink" style="text-align:center;"><span class="line ${product} ${linename}">${linename}</span></td>
              <td class="expand">${destination}</td>
              <td class="shrink" style="text-align:right;">${time}</td>
            </tr>
        `;
      }
      tablehtml += `
      </table>
      `
  
      this.content.innerHTML = tablehtml
    }
  
    setConfig(config) {
      if (!config.entity) {
        throw new Error('You need to define an entity');
      }
      this.config = config;
    }
  
    getCardSize() {
      return 1;
    }
  }
  
  customElements.define('mvg-card', MvgCard);