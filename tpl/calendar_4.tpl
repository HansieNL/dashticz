<table>
	{{#each events as | items |}}
	  {{#ifLe @index ../maxitems}}
		{{#each items as | item |}}
		  <tr><td class="agenda-date">{{moment item.start input="X" format=../../df}}</td>
		  <td class="agenda-title" style="color:{{item.color}};">{{item.title}}</td></tr>
		{{/each}}
	  {{/ifLe}}
	{{else}}
    <div class="agenda-empty">
      {{emptyText}}
    </div>
	{{/each}}
</table>